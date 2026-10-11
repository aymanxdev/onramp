"""The source list, the page fetcher and one parser per source.

Every parser takes the page HTML and its base URL and returns items shaped
`{key, title, date, url, text}`:

  key    stable identity used to tell items apart between runs
  title  short heading of the item
  date   ISO date (YYYY-MM-DD) or None when the page does not say
  url    the item's own link (or a page anchor when the page has no per-item links)
  text   readable body text, capped, handed to the drafting step as untrusted data

Parsers raise ParseError when the page no longer looks like the expected one, so a
changed layout is reported as a source failure instead of silently finding nothing.
Standard library plus PyYAML (for the source list) only.
"""
from __future__ import annotations

import re
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Callable
from urllib.parse import urljoin, urlparse

import yaml

from .htmltree import Node, parse_html

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)
REQUEST_TIMEOUT_SECONDS = 30
FETCH_ATTEMPTS = 2
MAX_PAGE_BYTES = 8_000_000
MAX_ITEM_TEXT = 3000
MAX_TITLE = 200

Item = dict


class FetchError(Exception):
    """The page could not be fetched."""


class ParseError(Exception):
    """The page was fetched but does not look like the expected layout."""


@dataclass(frozen=True)
class Source:
    id: str
    name: str
    url: str
    parser: str
    kind: str


def load_sources(path: Path) -> list[Source]:
    data = yaml.safe_load(Path(path).read_text(encoding="utf-8"))
    return [
        Source(id=s["id"], name=s.get("name", s["id"]), url=s["url"], parser=s["parser"], kind=s["kind"])
        for s in data["sources"]
    ]


def fetch(url: str, timeout: int = REQUEST_TIMEOUT_SECONDS, attempts: int = FETCH_ATTEMPTS) -> str:
    """GET a page with a browser-like User-Agent. Retries once after a short pause."""
    last: Exception | None = None
    for attempt in range(attempts):
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/html"})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                if resp.status != 200:
                    raise FetchError(f"unexpected status {resp.status}")
                if not same_host(resp.geturl(), url):
                    raise FetchError(f"redirected off the source host to {resp.geturl()}")
                return resp.read(MAX_PAGE_BYTES).decode("utf-8", errors="replace")
        except urllib.error.HTTPError as e:
            last = FetchError(f"HTTP {e.code}")
        except FetchError as e:
            last = e
        except (urllib.error.URLError, OSError, TimeoutError) as e:
            last = FetchError(f"could not reach the page: {e}")
        if attempt + 1 < attempts:
            time.sleep(2)
    assert last is not None
    raise FetchError(str(last))


# ---------------------------------------------------------------------------
# Small helpers
# ---------------------------------------------------------------------------

MONTHS = {
    name: i + 1
    for i, name in enumerate(
        ["january", "february", "march", "april", "may", "june", "july",
         "august", "september", "october", "november", "december"]
    )
}
for _full, _n in list(MONTHS.items()):
    MONTHS.setdefault(_full[:3], _n)
MONTHS["sept"] = 9

DATE_RE = re.compile(r"\b([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b")


def parse_date(text: str) -> str | None:
    """'October 7, 2026', 'Oct 06, 2026' or '2026-10-08' to an ISO date, else None."""
    text = text.strip()
    iso = re.search(r"\b(\d{4})-(\d{2})-(\d{2})\b", text)
    if iso:
        return _valid(int(iso[1]), int(iso[2]), int(iso[3]))
    m = DATE_RE.search(text)
    if not m:
        return None
    month = MONTHS.get(m[1].lower())
    if not month:
        return None
    return _valid(int(m[3]), month, int(m[2]))


def _valid(year: int, month: int, day: int) -> str | None:
    from datetime import date

    try:
        return date(year, month, day).isoformat()
    except ValueError:
        return None


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def same_host(url: str, source_url: str) -> bool:
    """True when url is https on the same host as the source page."""
    try:
        a, b = urlparse(url), urlparse(source_url)
    except ValueError:
        return False
    return a.scheme == "https" and bool(a.hostname) and a.hostname == b.hostname


def cap(text: str, limit: int = MAX_ITEM_TEXT) -> str:
    text = text.strip()
    return text if len(text) <= limit else text[:limit].rstrip() + " ..."


def _item(key: str, title: str, date: str | None, url: str, text: str) -> Item:
    title = cap(re.sub(r"\s+", " ", title), MAX_TITLE)
    return {"key": key, "title": title, "date": date, "url": url, "text": cap(text or title)}


# ---------------------------------------------------------------------------
# Support release notes: one article, a date heading (h3) then one or more items,
# each opened by a paragraph that is only bold text.
# ---------------------------------------------------------------------------

def _is_bold_only_paragraph(node: Node) -> str | None:
    p = node if node.tag == "p" else node.find(lambda n: n.tag == "p")
    if p is None:
        return None
    full = p.inline_text()
    if not full:
        return None
    bold = "".join(b.inline_text() for b in p.child_elements() if b.tag in ("b", "strong"))
    return full if bold and re.sub(r"\s+", "", bold) == re.sub(r"\s+", "", full) else None


def parse_support_release_notes(html: str, base_url: str) -> list[Item]:
    root = parse_html(html)
    article = root.find(lambda n: n.tag == "article")
    if article is None:
        raise ParseError("no <article> element found")

    items: list[Item] = []
    date: str | None = None
    anchor = ""
    title: str | None = None
    body: list[str] = []

    def flush() -> None:
        nonlocal title, body
        if title and date:
            url = f"{base_url}#{anchor}" if anchor else base_url
            items.append(_item(f"{date}|{slugify(title)}", title, date, url, "\n".join(body)))
        title, body = None, []

    for block in article.child_elements():
        h3 = block if block.tag == "h3" else block.find(lambda n: n.tag == "h3")
        if h3 is not None:
            new_date = parse_date(h3.inline_text())
            if new_date:
                flush()
                date, anchor = new_date, h3.attrs.get("id", "")
                continue
        if block.tag == "h2" or block.find(lambda n: n.tag == "h2") is not None:
            continue  # month headings
        heading = _is_bold_only_paragraph(block)
        if heading is not None:
            flush()
            title = heading
            continue
        text = block.text()
        if text:
            if title is None and date:
                # A dated block with no bold heading: use its first line as the title.
                title = text.split("\n", 1)[0][:120]
            body.append(text)
    flush()

    if not items:
        raise ParseError("no dated release-note items found")
    return items


# ---------------------------------------------------------------------------
# claude.dev: a list of post cards, each an <a href="/blog/..."> with a title and
# (except the featured post) a date. The featured post's date is in the page data.
# ---------------------------------------------------------------------------

def _roster_dates(html: str) -> dict[str, str]:
    """slug -> ISO date from the page's embedded post list, for cards with no date."""
    out: dict[str, str] = {}
    for m in re.finditer(r'\\?"slug\\?":\\?"([a-z0-9-]+)\\?"[^{}]*?\\?"date\\?":\\?"(\d{4}-\d{2}-\d{2})\\?"', html):
        out.setdefault(m[1], m[2])
    return out


def parse_claude_dev(html: str, base_url: str) -> list[Item]:
    root = parse_html(html)
    roster = _roster_dates(html)
    items: list[Item] = []
    seen: set[str] = set()
    for a in root.find_all(lambda n: n.tag == "a" and (n.attrs.get("href") or "").startswith("/blog/")):
        href = a.attrs["href"]
        title_node = a.find(lambda n: n.has_class_containing("p-title"))
        if title_node is None:
            continue
        url = urljoin(base_url + "/", href)
        if url in seen:
            continue
        seen.add(url)
        date_node = a.find(lambda n: n.has_class_containing("p-date"))
        date = parse_date(date_node.inline_text()) if date_node is not None else None
        if date is None:
            date = roster.get(href.strip("/").split("/")[-1])
        title = title_node.inline_text()
        items.append(_item(url, title, date, url, title))
    if not items:
        raise ParseError("no blog post cards found")
    return items


# ---------------------------------------------------------------------------
# anthropic.com/news: every post is an <a> that contains a <time>.
# ---------------------------------------------------------------------------

def parse_anthropic_news(html: str, base_url: str) -> list[Item]:
    root = parse_html(html)
    items: list[Item] = []
    seen: set[str] = set()
    for a in root.find_all(lambda n: n.tag == "a" and n.attrs.get("href", "").startswith("/")):
        time_node = a.find(lambda n: n.tag == "time")
        if time_node is None:
            continue
        url = urljoin(base_url, a.attrs["href"])
        if url in seen:
            continue
        title_node = a.find(lambda n: n.tag in ("h1", "h2", "h3", "h4", "h5", "h6")) or a.find(
            lambda n: n.has_class_containing("title") or n.has_class_containing("Title")
        )
        if title_node is None:
            continue
        seen.add(url)
        summary = a.find(lambda n: n.tag == "p")
        title = title_node.inline_text()
        text = f"{title}\n{summary.inline_text()}" if summary is not None else title
        items.append(_item(url, title, parse_date(time_node.inline_text()), url, text))
    if not items:
        raise ParseError("no dated news items found")
    return items


# ---------------------------------------------------------------------------
# Claude Code changelog: one block per version with id "2-1-296", a date and bullets.
# ---------------------------------------------------------------------------

VERSION_ID_RE = re.compile(r"^\d+-\d+-\d+$")


def parse_claude_code_changelog(html: str, base_url: str) -> list[Item]:
    root = parse_html(html)
    items: list[Item] = []
    for block in root.find_all(lambda n: n.tag == "div" and VERSION_ID_RE.match(n.attrs.get("id", "")) is not None):
        vid = block.attrs["id"]
        version = vid.replace("-", ".")
        date = None
        for node in block.iter():
            if node.tag == "li":
                break
            if node.tag == "div" and not node.child_elements():
                date = parse_date(node.inline_text())
                if date:
                    break
        bullets = [li.inline_text() for li in block.find_all(lambda n: n.tag == "li")]
        url = f"{base_url}#{vid}"
        items.append(_item(url, f"Claude Code {version}", date, url, "\n".join(f"- {b}" for b in bullets)))
    if not items:
        raise ParseError("no version blocks found")
    return items


PARSERS: dict[str, Callable[[str, str], list[Item]]] = {
    "support-release-notes": parse_support_release_notes,
    "claude-dev": parse_claude_dev,
    "anthropic-news": parse_anthropic_news,
    "claude-code-changelog": parse_claude_code_changelog,
}
PARSER_NAMES = frozenset(PARSERS)


def fetch_source(source: Source, fetcher: Callable[[str], str] = fetch) -> tuple[list[Item], str | None]:
    """Fetch and parse one source. Never raises: returns (items, None) or ([], reason)."""
    try:
        html = fetcher(source.url)
    except FetchError as e:
        return [], f"fetch failed: {e}"
    except Exception as e:  # noqa: BLE001 - a source must never take the run down
        return [], f"fetch failed: {type(e).__name__}: {e}"
    parser = PARSERS.get(source.parser)
    if parser is None:
        return [], f"unknown parser {source.parser!r}"
    try:
        items = parser(html, source.url.rstrip("/"))
    except ParseError as e:
        return [], f"parse failed: {e}"
    except Exception as e:  # noqa: BLE001
        return [], f"parse failed: {type(e).__name__}: {e}"
    # Drop links that leave the source host (e.g. "//other.example/x") and duplicate keys.
    seen: set[str] = set()
    unique = []
    for it in items:
        if not same_host(it["url"], source.url):
            continue
        if it["key"] not in seen:
            seen.add(it["key"])
            unique.append(it)
    return unique, None
