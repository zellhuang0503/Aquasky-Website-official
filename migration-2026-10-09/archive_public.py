"""Archive public Aqua Sky pages and their directly referenced same-site assets."""

import argparse
import hashlib
import html.parser
import http.client
import json
import mimetypes
import re
import time
import xml.etree.ElementTree as ET
from collections import deque
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urljoin, urlsplit, urlunsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener


HOST = "aquaskyplus.com"
SKIP_PATH = re.compile(r"/(?:admin|login|backend|cms|wp-admin|api|account|cart|checkout)(?:/|$)", re.I)
ASSET_SUFFIX = {".css", ".js", ".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".ico", ".woff", ".woff2", ".ttf", ".otf", ".mp4", ".doc", ".docx", ".xls", ".xlsx", ".zip"}
MIME_EXT = {"text/html": ".html", "text/css": ".css", "text/javascript": ".js", "application/javascript": ".js", "application/pdf": ".pdf", "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/svg+xml": ".svg", "image/gif": ".gif", "application/json": ".json"}


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def canonical(url, base=None, discovered=False):
    url = urljoin(base or "https://aquaskyplus.com/", url.strip())
    p = urlsplit(url)
    if p.scheme != "https" or p.hostname != HOST or p.username or p.password:
        return None
    if SKIP_PATH.search(p.path):
        return None
    if discovered and p.query:
        return None
    safe_path = quote(p.path or "/", safe="/%:@!$&'()*+,;=-._~")
    return urlunsplit((p.scheme, HOST, safe_path, p.query, ""))


class SameHostRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not canonical(newurl):
            raise ValueError("redirect leaves approved host")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


class References(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = set()
        self.in_style = False
        self.base_href = None

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "base" and a.get("href") and self.base_href is None:
            self.base_href = a["href"]
        if tag == "style":
            self.in_style = True
        for field in ("src", "poster", "data", "data-src", "data-original", "data-lazy-src", "data-background"):
            if a.get(field):
                self.urls.add(a[field])
        if a.get("style"):
            self.urls.update(re.findall(r"url\(\s*['\"]?([^)'\"]+)", a["style"], re.I))
        if a.get("srcset"):
            for item in a["srcset"].split(","):
                self.urls.add(item.strip().split(" ")[0])
        if tag == "link" and a.get("href") and any(x in (a.get("rel") or "").lower() for x in ("stylesheet", "icon", "preload")):
            self.urls.add(a["href"])
        if tag == "a" and a.get("href") and urlsplit(a["href"]).path.lower().endswith(tuple(ASSET_SUFFIX)):
            self.urls.add(a["href"])
        if tag == "meta" and a.get("property", "").lower() in ("og:image", "twitter:image") and a.get("content"):
            self.urls.add(a["content"])

    def handle_endtag(self, tag):
        if tag == "style":
            self.in_style = False

    def handle_data(self, data):
        if self.in_style:
            self.urls.update(re.findall(r"url\(\s*['\"]?([^)'\"]+)", data, re.I))


def references(data, mime):
    text = data.decode("utf-8", errors="replace")
    if mime == "text/html":
        parser = References()
        parser.feed(text)
        return parser.urls
    if mime == "text/css":
        return set(re.findall(r"url\(\s*['\"]?([^)'\"]+)", text, re.I))
    return set()


def references_with_base(data, mime, page_url):
    if mime == "text/html":
        parser = References()
        parser.feed(data.decode("utf-8", errors="replace"))
        return parser.urls, urljoin(page_url, parser.base_href) if parser.base_href else page_url
    return references(data, mime), page_url


def append_jsonl(path, record):
    with path.open("a", encoding="utf-8", newline="\n") as f:
        f.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")


def read_done(path):
    done = {}
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            try:
                row = json.loads(line)
                if (path.parent / row["relative_path"]).is_file():
                    done[row["url"]] = row
            except (ValueError, KeyError):
                pass
    return done


def read_terminal_failures(path):
    if not path.exists():
        return set()
    terminal = set()
    for line in path.read_text(encoding="utf-8").splitlines():
        try:
            row = json.loads(line)
            if row.get("http_status") in (404, 410):
                terminal.add(row["url"])
        except (ValueError, KeyError):
            pass
    return terminal


def fetch(opener, url, out):
    req = Request(url, headers={"User-Agent": "AquaSkyPublicArchive/1.0", "Accept": "text/html,application/pdf,image/*,text/css,*/*;q=0.8"})
    try:
        response = opener.open(req, timeout=25)
    except HTTPError as exc:
        return {"url": url, "retrieved_at": utc_now(), "http_status": exc.code, "error": "HTTP error"}, None, None
    with response:
        status = response.status
        mime = response.headers.get_content_type()
        final_url = response.geturl()
        if not canonical(final_url):
            return {"url": url, "retrieved_at": utc_now(), "http_status": status, "error": "final URL outside approved host"}, None, None
        data = response.read(80_000_001)
    row = {"url": url, "final_url": final_url, "retrieved_at": utc_now(), "http_status": status, "content_type": mime, "size_bytes": len(data)}
    if status != 200:
        row["error"] = "unexpected HTTP status"
        return row, None, None
    if len(data) > 80_000_000:
        row["error"] = "exceeds 80 MB limit"
        return row, None, None
    if urlsplit(url).path.lower().endswith(".pdf") and (mime != "application/pdf" or not data.startswith(b"%PDF-")):
        row["error"] = "PDF URL returned non-PDF content"
        return row, None, None
    if mime == "application/pdf" and not data.startswith(b"%PDF-"):
        row["error"] = "PDF content missing PDF signature"
        return row, None, None
    if Path(urlsplit(url).path).suffix.lower() in ASSET_SUFFIX and mime == "text/html":
        row["error"] = "asset URL returned HTML"
        return row, None, None
    suffix = MIME_EXT.get(mime) or Path(urlsplit(url).path).suffix.lower()
    if suffix not in ASSET_SUFFIX | {".html", ".htm", ".xml", ".txt", ".json"}:
        suffix = mimetypes.guess_extension(mime) or ".bin"
    digest = hashlib.sha256(url.encode()).hexdigest()
    rel = Path("content") / digest[:2] / (digest + suffix)
    dest = out / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        row["error"] = "destination exists without matching success manifest"
        return row, None, None
    tmp = dest.with_suffix(dest.suffix + ".part")
    tmp.write_bytes(data)
    tmp.replace(dest)
    row["sha256"] = hashlib.sha256(data).hexdigest()
    row["relative_path"] = rel.as_posix()
    return row, data, mime


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--output", type=Path, required=True)
    p.add_argument("--url", action="append", default=[])
    p.add_argument("--url-file", type=Path)
    p.add_argument("--sitemap-file", type=Path)
    p.add_argument("--max-items", type=int, default=30)
    p.add_argument("--delay", type=float, default=1.0)
    args = p.parse_args()
    out = args.output.resolve()
    out.mkdir(parents=True, exist_ok=True)
    success = out / "success.jsonl"
    failure = out / "failures.jsonl"
    done = read_done(success)
    terminal_failures = read_terminal_failures(failure)
    seeds = args.url[:]
    if args.url_file:
        payload = json.loads(args.url_file.read_text(encoding="utf-8"))
        if isinstance(payload, list):
            seeds += [x for x in payload if isinstance(x, str)]
        else:
            raise ValueError("URL file must be a JSON string array")
    if args.sitemap_file:
        root = ET.fromstring(args.sitemap_file.read_bytes())
        seeds += [e.text for e in root.findall(".//{http://www.sitemaps.org/schemas/sitemap/0.9}loc") if e.text]
    queue = deque((u, False) for u in seeds)
    seen = set()
    opener = build_opener(SameHostRedirect())
    count = 0
    while queue and count < args.max_items:
        raw, discovered = queue.popleft()
        url = canonical(raw, discovered=discovered)
        if not url or url in seen or url in terminal_failures:
            continue
        seen.add(url)
        if url in done:
            row = done[url]
            if row.get("content_type") in ("text/html", "text/css"):
                data = (out / row["relative_path"]).read_bytes()
                refs, base_url = references_with_base(data, row["content_type"], url)
                for ref in sorted(refs):
                    target = canonical(ref, base_url, discovered=True)
                    if target and target not in seen:
                        queue.append((target, True))
            continue
        count += 1
        try:
            row, data, mime = fetch(opener, url, out)
        except (OSError, URLError, ValueError, http.client.HTTPException) as exc:
            row, data, mime = {"url": url, "retrieved_at": utc_now(), "error": str(exc)}, None, None
        append_jsonl(success if data is not None else failure, row)
        print(json.dumps({"url": url, "status": row.get("http_status"), "ok": data is not None, "error": row.get("error")}, ensure_ascii=False), flush=True)
        if row.get("http_status") in (403, 429, 503):
            print("Stopped after an access limit or service warning; manual review required.", flush=True)
            break
        if data is not None and mime in ("text/html", "text/css"):
            refs, base_url = references_with_base(data, mime, url)
            for ref in sorted(refs):
                target = canonical(ref, base_url, discovered=True)
                if target and target not in seen:
                    queue.append((target, True))
        if queue and count < args.max_items:
            time.sleep(max(0.0, args.delay))
    print(json.dumps({"attempted_this_run": count, "remaining_in_queue": len(queue), "successful_total": len(read_done(success))}), flush=True)


if __name__ == "__main__":
    main()
