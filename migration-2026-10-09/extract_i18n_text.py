"""Extract visible text of selected pages in all six languages from an archive run, as
side-by-side Markdown files for glossary building and translation.

Offline only: reads success.jsonl and the content/ files of one archive directory.

Usage:
  python extract_i18n_text.py <archive_dir> --out <output_dir> [--pages PATH ...]

For each page path (e.g. "LQCOL-PLUS", "about", "" for the language home page) the script
looks up https://aquaskyplus.com/<lang>/<path> for en, zh, es, fr, ru, ar and writes
<output_dir>/<page>.md with one section per language. Each line is a text block tagged
with its HTML element ([title], [meta], [h1]..[h4], [p], [li], [td], [th], [a], [other]),
in document order, so the same block can be matched across languages by position.
"""

import argparse
import html.parser
import json
import re
from pathlib import Path

LANGS = ["en", "zh", "es", "fr", "ru", "ar"]
DEFAULT_PAGES = [
    "", "LQCOL-PLUS", "PUMPLUS", "MEGA-PLUS", "THERMAL-PLUS", "RO-PLUS", "HYDRO-PLUS",
    "SOLAR-PLUS", "PREMIUM-PLUS", "GIGA-PLUS", "products", "accessories", "about",
    "feature", "certification", "FAQ", "contact", "sel_tools", "sel_unit_ps",
    "sel_unit_vsd", "sel_unit_thermal", "downloadpage", "supreme", "asme-ht", "dl-ce",
    "news", "videos",
]
BLOCK_TAGS = {"h1", "h2", "h3", "h4", "h5", "h6", "p", "li", "td", "th", "dt", "dd",
              "figcaption", "label", "button", "option", "summary", "caption", "blockquote"}
SKIP_TAGS = {"script", "style", "noscript", "template", "svg"}


class Blocks(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.blocks = []
        self.stack = []
        self.skip = 0
        self.buf = []
        self.cur = None
        self.title = ""
        self.in_title = False
        self.meta_description = ""
        self.dir_attr = ""

    def flush(self):
        text = re.sub(r"\s+", " ", "".join(self.buf)).strip()
        if text:
            self.blocks.append((self.cur or "other", text))
        self.buf = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "html" and a.get("dir"):
            self.dir_attr = a["dir"]
        if tag in SKIP_TAGS:
            self.skip += 1
            return
        if tag == "title":
            self.in_title = True
            return
        if tag == "meta" and (a.get("name") or "").lower() == "description":
            self.meta_description = (a.get("content") or "").strip()
            return
        if tag in BLOCK_TAGS or tag in ("div", "section", "article", "header", "footer",
                                        "nav", "ul", "ol", "table", "tr", "br", "form"):
            self.flush()
            if tag in BLOCK_TAGS:
                self.cur = tag
                self.stack.append(tag)
        if tag == "a" and self.cur is None:
            self.flush()
            self.cur = "a"
            self.stack.append("a")

    def handle_endtag(self, tag):
        if tag in SKIP_TAGS:
            self.skip = max(0, self.skip - 1)
            return
        if tag == "title":
            self.in_title = False
            return
        if self.stack and self.stack[-1] == tag:
            self.flush()
            self.stack.pop()
            self.cur = self.stack[-1] if self.stack else None
        elif tag in ("div", "section", "article", "header", "footer", "nav", "ul", "ol",
                     "table", "tr", "form"):
            self.flush()

    def handle_data(self, data):
        if self.skip:
            return
        if self.in_title:
            self.title += data
            return
        self.buf.append(data)

    def close(self):
        super().close()
        self.flush()


def load_manifest(archive):
    by_url = {}
    for line in (archive / "success.jsonl").read_text(encoding="utf-8").splitlines():
        if line.strip():
            row = json.loads(line)
            by_url[row["url"]] = row
    return by_url


def extract(archive, row):
    data = (archive / row["relative_path"]).read_bytes()
    p = Blocks()
    p.feed(data.decode("utf-8", errors="replace"))
    p.close()
    out = []
    if p.title.strip():
        out.append(("title", re.sub(r"\s+", " ", p.title).strip()))
    if p.meta_description:
        out.append(("meta", p.meta_description))
    last = None
    for tag, text in p.blocks:
        if (tag, text) == last:
            continue
        out.append((tag, text))
        last = (tag, text)
    return out, p.dir_attr


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("archive", type=Path)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--pages", nargs="*", default=DEFAULT_PAGES)
    ap.add_argument("--langs", nargs="*", default=LANGS)
    args = ap.parse_args()
    archive = args.archive.resolve()
    by_url = load_manifest(archive)
    args.out.mkdir(parents=True, exist_ok=True)
    summary = []
    for page in args.pages:
        name = page or "home"
        lines = [f"# /{page}", "", f"來源封存：`{archive.name}`。每行格式 `[元素] 文字`，六語系依文件順序輸出，同位置的區塊可互相對照。", ""]
        found = 0
        for lang in args.langs:
            url = f"https://aquaskyplus.com/{lang}/{page}" if page else f"https://aquaskyplus.com/{lang}"
            row = by_url.get(url)
            lines.append(f"## {lang}")
            lines.append("")
            if not row or row.get("content_type") != "text/html":
                lines.append(f"（封存裡沒有 {url}）")
                lines.append("")
                continue
            blocks, dir_attr = extract(archive, row)
            found += 1
            lines.append(f"來源：{url}　SHA-256：`{row.get('sha256', '')[:16]}…`　抓取：{row.get('retrieved_at', '')[:10]}" + (f"　dir={dir_attr}" if dir_attr else ""))
            lines.append("")
            for tag, text in blocks:
                lines.append(f"[{tag}] {text}")
            lines.append("")
        (args.out / f"{name}.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
        summary.append({"page": name, "languages_found": found})
        print(json.dumps(summary[-1], ensure_ascii=False))
    (args.out / "_index.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
