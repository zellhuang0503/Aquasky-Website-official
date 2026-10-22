"""Compare two archive runs (made by archive_public.py) without contacting the website.

Usage:
  python diff_archives.py <baseline_dir> <latest_dir> --write-report

Reads success.jsonl / failures.jsonl in both directories and reports which URLs were
added, removed, changed or unchanged. HTML pages are compared twice: by raw SHA-256
(any byte difference) and by visible text (tags, scripts and styles stripped, whitespace
collapsed), so that layout noise such as tokens or timestamps does not hide real content
changes. Writes diff_report.json and diff_report.md into <latest_dir> when --write-report
is given.
"""

import argparse
import hashlib
import html.parser
import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit


def rows(path):
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


class VisibleText(html.parser.HTMLParser):
    SKIP = {"script", "style", "noscript", "template"}

    def __init__(self):
        super().__init__()
        self.parts = []
        self.skip_depth = 0
        self.title = ""
        self.in_title = False

    def handle_starttag(self, tag, attrs):
        if tag in self.SKIP:
            self.skip_depth += 1
        if tag == "title":
            self.in_title = True
        a = dict(attrs)
        if tag == "img" and a.get("alt"):
            self.parts.append(a["alt"])
        if tag == "meta" and a.get("name", "").lower() == "description" and a.get("content"):
            self.parts.append(a["content"])

    def handle_endtag(self, tag):
        if tag in self.SKIP and self.skip_depth:
            self.skip_depth -= 1
        if tag == "title":
            self.in_title = False

    def handle_data(self, data):
        if self.skip_depth:
            return
        if self.in_title:
            self.title += data
        self.parts.append(data)


def visible_text(data):
    parser = VisibleText()
    parser.feed(data.decode("utf-8", errors="replace"))
    text = re.sub(r"\s+", " ", " ".join(parser.parts)).strip()
    return text, re.sub(r"\s+", " ", parser.title).strip()


def text_digest(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def section(url):
    parts = [p for p in urlsplit(url).path.split("/") if p]
    if not parts:
        return "/"
    if len(parts) == 1:
        return parts[0]
    return parts[1]


def load(directory):
    directory = Path(directory)
    by_url = {}
    for row in rows(directory / "success.jsonl"):
        by_url[row["url"]] = row
    failed = {row["url"]: row for row in rows(directory / "failures.jsonl")}
    return directory, by_url, failed


def html_signature(directory, row, cache):
    key = (str(directory), row["url"])
    if key not in cache:
        file = directory / row["relative_path"]
        if file.is_file():
            text, title = visible_text(file.read_bytes())
            cache[key] = (text_digest(text), title, len(text))
        else:
            cache[key] = (None, "", 0)
    return cache[key]


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("baseline", type=Path)
    parser.add_argument("latest", type=Path)
    parser.add_argument("--write-report", action="store_true")
    args = parser.parse_args()

    base_dir, base, base_failed = load(args.baseline)
    new_dir, new, new_failed = load(args.latest)
    cache = {}

    added, removed, changed_bytes, changed_text, unchanged = [], [], [], [], []
    for url in sorted(set(base) | set(new)):
        b, n = base.get(url), new.get(url)
        if b and not n:
            removed.append({"url": url, "content_type": b.get("content_type"), "now_failed_status": new_failed.get(url, {}).get("http_status")})
            continue
        if n and not b:
            added.append({"url": url, "content_type": n.get("content_type"), "size_bytes": n.get("size_bytes")})
            continue
        if b.get("sha256") == n.get("sha256"):
            unchanged.append(url)
            continue
        entry = {"url": url, "content_type": n.get("content_type"), "old_size": b.get("size_bytes"), "new_size": n.get("size_bytes")}
        if n.get("content_type") == "text/html" and b.get("content_type") == "text/html":
            b_sig = html_signature(base_dir, b, cache)
            n_sig = html_signature(new_dir, n, cache)
            entry.update({"old_title": b_sig[1], "new_title": n_sig[1], "old_text_chars": b_sig[2], "new_text_chars": n_sig[2]})
            if b_sig[0] != n_sig[0]:
                changed_text.append(entry)
            else:
                changed_bytes.append(entry)
        else:
            changed_text.append(entry)

    def by_section(items):
        return dict(Counter(section(i["url"]) for i in items))

    report = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "baseline_dir": str(base_dir),
        "latest_dir": str(new_dir),
        "baseline_url_count": len(base),
        "latest_url_count": len(new),
        "added_count": len(added),
        "removed_count": len(removed),
        "changed_content_count": len(changed_text),
        "changed_markup_only_count": len(changed_bytes),
        "unchanged_count": len(unchanged),
        "added_by_section": by_section(added),
        "removed_by_section": by_section(removed),
        "changed_content_by_section": by_section(changed_text),
        "added_by_type": dict(Counter(i["content_type"] for i in added)),
        "changed_content_by_type": dict(Counter(i["content_type"] for i in changed_text)),
        "newly_failing_urls": sorted(set(new_failed) - set(base_failed) - set(new)),
        "added": added,
        "removed": removed,
        "changed_content": changed_text,
        "changed_markup_only": changed_bytes,
    }

    lines = [
        f"# 封存比對報告",
        "",
        f"產生時間（UTC）：{report['generated_at_utc']}",
        f"基準：`{base_dir}`（{len(base)} 個 URL）",
        f"最新：`{new_dir}`（{len(new)} 個 URL）",
        "",
        "| 項目 | 數量 |",
        "| --- | ---: |",
        f"| 新增 URL | {len(added)} |",
        f"| 消失 URL | {len(removed)} |",
        f"| 內容有變（文字或檔案） | {len(changed_text)} |",
        f"| 只有標記變、文字相同 | {len(changed_bytes)} |",
        f"| 完全相同 | {len(unchanged)} |",
        f"| 新出現的抓取失敗 | {len(report['newly_failing_urls'])} |",
        "",
    ]

    def table(title, items, cols):
        if not items:
            return
        lines.append(f"## {title}（{len(items)}）")
        lines.append("")
        lines.append("| " + " | ".join(cols) + " |")
        lines.append("| " + " | ".join("---" for _ in cols) + " |")
        for item in items:
            lines.append("| " + " | ".join(str(item.get(c, "") if item.get(c) is not None else "") for c in cols) + " |")
        lines.append("")

    table("新增 URL", added, ["url", "content_type", "size_bytes"])
    table("消失 URL", removed, ["url", "content_type", "now_failed_status"])
    table("內容有變", changed_text, ["url", "content_type", "old_title", "new_title", "old_size", "new_size"])
    table("只有標記變", changed_bytes, ["url", "old_size", "new_size"])
    if report["newly_failing_urls"]:
        lines.append(f"## 新出現的抓取失敗（{len(report['newly_failing_urls'])}）")
        lines.append("")
        lines.extend(f"- {u}" for u in report["newly_failing_urls"])
        lines.append("")

    if args.write_report:
        (new_dir / "diff_report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        (new_dir / "diff_report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    summary = {k: v for k, v in report.items() if k not in ("added", "removed", "changed_content", "changed_markup_only")}
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
