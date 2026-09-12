#!/usr/bin/env python3
"""Downloads each officialUrl in catalogue.yaml to pipeline/corpus/<slug>.md so
Graphify has a folder of markdown to read. Standard library only (urllib for
HTTP and robots, html.parser for the text extraction).

Rules:
    - Respects robots.txt (urllib.robotparser).
    - Caches by ETag / Last-Modified in pipeline/corpus/.cache.json, so a
      second run only re-downloads pages that changed.
    - One request per second, always, even on a cache hit that still needs a
      conditional request.
    - Sends the user agent onramp-pipeline/0.1 (+https://github.com/aymanxdev/onramp).
    - Never run automatically as part of this session; it makes real network
      requests. Intended to run in CI or by hand before `graphify . --output
      graphify-out`.
    - The corpus directory is git-ignored and rebuilt on demand; nothing here
      is committed.

Usage:
    python3 pipeline/fetch_corpus.py [pipeline/catalogue.yaml]
"""
from __future__ import annotations

import html.parser
import json
import re
import sys
import time
import urllib.error
import urllib.request
import urllib.robotparser
from pathlib import Path
from urllib.parse import urlparse

import yaml

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_CATALOGUE = REPO_ROOT / "pipeline" / "catalogue.yaml"
CORPUS_DIR = REPO_ROOT / "pipeline" / "corpus"
CACHE_FILE = CORPUS_DIR / ".cache.json"
USER_AGENT = "onramp-pipeline/0.1 (+https://github.com/aymanxdev/onramp)"
REQUEST_INTERVAL_SECONDS = 1.0


class TextExtractor(html.parser.HTMLParser):
    """A minimal HTML to text converter: enough for a corpus Graphify can
    read, not a faithful rendering. Drops script and style content."""

    SKIP_TAGS = {"script", "style", "noscript", "svg"}
    BLOCK_TAGS = {"p", "div", "section", "article", "li", "h1", "h2", "h3",
                  "h4", "h5", "h6", "br", "tr", "table", "ul", "ol"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.chunks: list[str] = []
        self._skip_depth = 0

    def handle_starttag(self, tag: str, attrs) -> None:
        if tag in self.SKIP_TAGS:
            self._skip_depth += 1
        if tag in self.BLOCK_TAGS:
            self.chunks.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag in self.SKIP_TAGS and self._skip_depth > 0:
            self._skip_depth -= 1
        if tag in self.BLOCK_TAGS:
            self.chunks.append("\n")

    def handle_data(self, data: str) -> None:
        if self._skip_depth == 0:
            self.chunks.append(data)

    def text(self) -> str:
        raw = "".join(self.chunks)
        raw = re.sub(r"[ \t]+", " ", raw)
        raw = re.sub(r"\n[ \t]*", "\n", raw)
        raw = re.sub(r"\n{3,}", "\n\n", raw)
        return raw.strip()


def slugify(url: str) -> str:
    parsed = urlparse(url)
    slug = f"{parsed.netloc}{parsed.path}".strip("/")
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", slug).strip("-").lower()
    return slug or "index"


def collect_urls(catalogue: dict) -> dict[str, str]:
    """Returns {slug: url}, one entry per distinct officialUrl in the
    catalogue, across every node type."""
    urls: dict[str, str] = {}
    for key in ("surfaces", "capabilities", "connectors", "skills", "plans", "features"):
        for item in catalogue.get(key) or []:
            url = item.get("officialUrl")
            if url:
                urls[slugify(url)] = url
    for item in catalogue.get("changelog") or []:
        url = item.get("url")
        if url:
            urls[slugify(url)] = url
    return urls


def load_cache() -> dict:
    if CACHE_FILE.exists():
        with open(CACHE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_cache(cache: dict) -> None:
    CORPUS_DIR.mkdir(parents=True, exist_ok=True)
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(cache, f, indent=2, sort_keys=True)


def robots_allow(url: str, agent: str = USER_AGENT) -> bool:
    parsed = urlparse(url)
    robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
    rp = urllib.robotparser.RobotFileParser()
    rp.set_url(robots_url)
    try:
        rp.read()
    except (urllib.error.URLError, OSError):
        # No readable robots.txt: default to allow, the polite way round
        # for a site that has not published one.
        return True
    return rp.can_fetch(agent, url)


def fetch(url: str, cache_entry: dict) -> tuple[int, str, dict]:
    headers = {"User-Agent": USER_AGENT}
    if cache_entry.get("etag"):
        headers["If-None-Match"] = cache_entry["etag"]
    if cache_entry.get("last_modified"):
        headers["If-Modified-Since"] = cache_entry["last_modified"]

    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            new_cache = {
                "etag": resp.headers.get("ETag"),
                "last_modified": resp.headers.get("Last-Modified"),
            }
            return resp.status, body, new_cache
    except urllib.error.HTTPError as e:
        if e.code == 304:
            return 304, "", cache_entry
        return e.code, "", cache_entry
    except (urllib.error.URLError, OSError) as e:
        print(f"fetch_corpus: could not reach {url}: {e}", file=sys.stderr)
        return 0, "", cache_entry


def main() -> int:
    catalogue_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_CATALOGUE
    with open(catalogue_path, "r", encoding="utf-8") as f:
        catalogue = yaml.safe_load(f)

    urls = collect_urls(catalogue)
    cache = load_cache()
    CORPUS_DIR.mkdir(parents=True, exist_ok=True)

    fetched, skipped, failed = 0, 0, 0
    for slug, url in sorted(urls.items()):
        if not robots_allow(url):
            print(f"fetch_corpus: robots.txt disallows {url}, skipping")
            skipped += 1
            time.sleep(REQUEST_INTERVAL_SECONDS)
            continue

        entry = cache.get(slug, {})
        status, body, new_cache = fetch(url, entry)
        time.sleep(REQUEST_INTERVAL_SECONDS)

        if status == 304:
            print(f"fetch_corpus: not modified, {slug}")
            skipped += 1
            continue
        if status != 200:
            print(f"fetch_corpus: {status or 'error'} fetching {url}")
            failed += 1
            continue

        extractor = TextExtractor()
        extractor.feed(body)
        text = extractor.text()
        out_path = CORPUS_DIR / f"{slug}.md"
        out_path.write_text(f"# {url}\n\nSource: {url}\n\n{text}\n", encoding="utf-8")
        cache[slug] = {**new_cache, "url": url}
        fetched += 1
        print(f"fetch_corpus: wrote {out_path.relative_to(REPO_ROOT)}")

    save_cache(cache)
    print(f"fetch_corpus: {fetched} fetched, {skipped} skipped (cached or disallowed), {failed} failed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
