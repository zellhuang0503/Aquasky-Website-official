"""Trace five old PDF 404s back to source href and HTML base."""

import argparse
import json
from pathlib import Path

from archive_public import canonical, references_with_base


def main():
    p = argparse.ArgumentParser()
    p.add_argument("directory", type=Path)
    args = p.parse_args()
    out = args.directory
    success = {row["url"]: row for line in (out / "success.jsonl").read_text(encoding="utf-8").splitlines() if (row := json.loads(line))}
    source_report = out / "failed_references_pre_base.json"
    failures = json.loads(source_report.read_text(encoding="utf-8"))
    sample = [row for row in failures if row["url"].lower().endswith(".pdf") and row["source_references"]][:5]
    results = []
    for row in sample:
        source = row["source_references"][0]
        page = success[source["source_url"]]
        data = (out / page["relative_path"]).read_bytes()
        refs, base = references_with_base(data, "text/html", source["source_url"])
        href = source["original_ref"]
        corrected = canonical(href, base, discovered=True)
        saved = success.get(corrected)
        results.append({
            "source_page": source["source_url"],
            "old_404_url": row["url"],
            "raw_href": href,
            "href_present_in_source_html": href.encode() in data,
            "href_present_after_html_parse": href in refs,
            "effective_base": base,
            "corrected_url": corrected,
            "corrected_http_status": saved and saved["http_status"],
            "corrected_final_url": saved and saved["final_url"],
            "corrected_content_type": saved and saved["content_type"],
        })
    print(json.dumps(results, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
