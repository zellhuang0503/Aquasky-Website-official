"""Check archive coverage and file integrity without contacting the website."""

import argparse
import hashlib
import json
import xml.etree.ElementTree as ET
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from archive_public import canonical, references_with_base


def rows(path):
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("directory", type=Path)
    parser.add_argument("--verify-hashes", action="store_true")
    parser.add_argument("--inventory", type=Path)
    parser.add_argument("--write-report", action="store_true")
    args = parser.parse_args()
    out = args.directory
    success = rows(out / "success.jsonl")
    failure = rows(out / "failures.jsonl")
    failed_urls = {row["url"] for row in failure}
    by_url = {row["url"]: row for row in success}
    sitemap = by_url.get("https://aquaskyplus.com/sitemap.xml")
    sitemap_urls = []
    if sitemap:
        tree = ET.fromstring((out / sitemap["relative_path"]).read_bytes())
        sitemap_urls = [canonical(e.text) for e in tree.findall(".//{http://www.sitemaps.org/schemas/sitemap/0.9}loc") if e.text]
    inventory_urls = []
    if args.inventory:
        inventory_urls = json.loads(args.inventory.read_text(encoding="utf-8"))
    refs = set()
    ref_origins = {}

    def include_references(row):
        data = (out / row["relative_path"]).read_bytes()
        raw_refs, base_url = references_with_base(data, row["content_type"], row["url"])
        found = set()
        for ref in raw_refs:
            target = canonical(ref, base_url, discovered=True)
            if target:
                refs.add(target)
                found.add(target)
                ref_origins.setdefault(target, set()).add((row["url"], ref))
        return found

    css_queue = []
    for row in success:
        if row.get("content_type") == "text/html":
            css_queue.extend(include_references(row))
    visited_css = set()
    while css_queue:
        url = css_queue.pop()
        row = by_url.get(url)
        if url not in visited_css and row and row.get("content_type") == "text/css":
            visited_css.add(url)
            css_queue.extend(include_references(row))
    bad = []
    if args.verify_hashes:
        for row in success:
            file = out / row["relative_path"]
            if not file.is_file():
                bad.append({"url": row["url"], "issue": "missing file"})
            elif hashlib.sha256(file.read_bytes()).hexdigest() != row["sha256"]:
                bad.append({"url": row["url"], "issue": "hash mismatch"})
    report = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "sitemap_url_count": len(sitemap_urls),
        "sitemap_saved_count": sum(url in by_url for url in sitemap_urls),
        "sitemap_missing_urls": sorted(url for url in sitemap_urls if url not in by_url),
        "inventory_url_count": len(inventory_urls),
        "inventory_saved_count": sum(url in by_url for url in inventory_urls),
        "inventory_missing_urls": sorted(url for url in inventory_urls if url not in by_url),
        "inventory_only_urls": sorted(set(inventory_urls) - set(sitemap_urls)),
        "sitemap_only_urls": sorted(set(sitemap_urls) - set(inventory_urls)),
        "referenced_same_site_url_count": len(refs),
        "referenced_saved_count": sum(url in by_url for url in refs),
        "referenced_not_saved_count": sum(url not in by_url for url in refs),
        "referenced_failed_url_count": sum(url in failed_urls for url in refs),
        "referenced_pending_url_count": sum(url not in by_url and url not in failed_urls for url in refs),
        "successful_url_count": len(by_url),
        "failed_attempt_count": len(failure),
        "failed_unique_url_count": len(failed_urls),
        "failed_still_referenced_url_count": len(failed_urls & refs),
        "failed_no_longer_referenced_url_count": len(failed_urls - refs),
        "failure_statuses": dict(Counter(str(row.get("http_status", "none")) for row in failure)),
        "content_types": dict(Counter(row.get("content_type") for row in success)),
        "stored_bytes": sum(row.get("size_bytes", 0) for row in success),
        "integrity_issues": bad,
    }
    failed_refs = [
        {
            **row,
            "currently_referenced": row["url"] in refs,
            "source_references": [
                {"source_url": source, "original_ref": original}
                for source, original in sorted(ref_origins.get(row["url"], set()))
            ],
        }
        for row in failure
    ]
    if args.write_report:
        (out / "coverage_report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        (out / "failed_references.json").write_text(json.dumps([row for row in failed_refs if row["currently_referenced"]], ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        (out / "obsolete_failure_attempts.json").write_text(json.dumps([row for row in failed_refs if not row["currently_referenced"]], ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        (out / "pending_references.json").write_text(json.dumps(sorted(refs - by_url.keys() - failed_urls), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
