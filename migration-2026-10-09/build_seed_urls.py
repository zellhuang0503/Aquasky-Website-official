"""Build a crawl seed list from an existing archive, without contacting the website.

Union of: an existing URL list (e.g. combined_public_urls.json), a sitemap file, and every
same-site link found inside the archived HTML/CSS. archive_public.py and audit_archive.py
only follow references that look like assets, so page-to-page <a href> links (such as the
sel_unit_* calculator pages) are collected here as well. Also reports <form action> and
<iframe src> targets, which are the places a server-side calculation would live.

Usage:
  python build_seed_urls.py <archive_dir> --out seed_urls_YYYY-MM-DD.json
                            [--url-file combined_public_urls.json] [--sitemap-file sitemap.xml]
"""

import argparse
import html.parser
import json
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path
from urllib.parse import urljoin, urlsplit

from archive_public import canonical, references_with_base

SITEMAP_NS = "{http://www.sitemaps.org/schemas/sitemap/0.9}"


class PageLinks(html.parser.HTMLParser):
    """Collect every <a href>, <form action> and <iframe src>, plus any <base href>."""

    def __init__(self):
        super().__init__()
        self.links = set()
        self.forms = set()
        self.frames = set()
        self.base_href = None

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "base" and a.get("href") and self.base_href is None:
            self.base_href = a["href"]
        elif tag == "a" and a.get("href"):
            self.links.add(a["href"])
        elif tag == "form":
            self.forms.add(a.get("action", "") or "(empty action = posts to itself)")
        elif tag == "iframe" and a.get("src"):
            self.frames.add(a["src"])


def rows(path):
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("archive", type=Path)
    p.add_argument("--out", type=Path, required=True)
    p.add_argument("--url-file", type=Path, action="append", default=[])
    p.add_argument("--sitemap-file", type=Path, action="append", default=[])
    args = p.parse_args()

    out = args.archive.resolve()
    success = rows(out / "success.jsonl")
    by_url = {row["url"]: row for row in success}

    from_list, from_sitemap = set(), set()
    for f in args.url_file:
        for u in json.loads(f.read_text(encoding="utf-8")):
            if isinstance(u, str) and (c := canonical(u)):
                from_list.add(c)
    for f in args.sitemap_file:
        root = ET.fromstring(f.read_bytes())
        for e in root.findall(f".//{SITEMAP_NS}loc"):
            if e.text and (c := canonical(e.text)):
                from_sitemap.add(c)

    page_links, asset_refs = set(), set()
    forms, frames = Counter(), Counter()
    for row in success:
        if row.get("content_type") not in ("text/html", "text/css"):
            continue
        data = (out / row["relative_path"]).read_bytes()
        refs, base_url = references_with_base(data, row["content_type"], row["url"])
        for ref in refs:
            if c := canonical(ref, base_url, discovered=True):
                asset_refs.add(c)
        if row["content_type"] != "text/html":
            continue
        parser = PageLinks()
        parser.feed(data.decode("utf-8", errors="replace"))
        page_base = urljoin(row["url"], parser.base_href) if parser.base_href else row["url"]
        for ref in parser.links:
            if c := canonical(ref, page_base, discovered=True):
                page_links.add(c)
        for action in parser.forms:
            forms[action] += 1
        for src in parser.frames:
            frames[src.split("?")[0]] += 1

    seeds = sorted(from_list | from_sitemap | page_links | asset_refs)
    args.out.write_text(json.dumps(seeds, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    def ext(url):
        return Path(urlsplit(url).path).suffix.lower() or "(no suffix / page)"

    summary = {
        "archive": str(out),
        "seed_total": len(seeds),
        "from_url_file": len(from_list),
        "from_sitemap": len(from_sitemap),
        "from_archived_page_links": len(page_links),
        "from_archived_asset_refs": len(asset_refs),
        "new_vs_url_file_and_sitemap": len(set(seeds) - from_list - from_sitemap),
        "not_yet_archived": sorted(u for u in seeds if u not in by_url),
        "not_yet_archived_count": sum(u not in by_url for u in seeds),
        "seed_by_suffix": dict(Counter(ext(u) for u in seeds).most_common()),
        "form_actions": dict(forms.most_common()),
        "iframe_sources": dict(frames.most_common(20)),
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
