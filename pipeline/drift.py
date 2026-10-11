#!/usr/bin/env python3
"""Fetches a source page (Claude release notes by default), converts it to
plain text, and diffs it against a committed snapshot. Standard library
only, Python 3.12.

Used weekly by .github/workflows/catalogue-drift.yml: if the page has moved
on since the last snapshot, this writes a short report to `--out` and opens
a "catalogue.yaml is stale" issue from it. A human then updates the
catalogue and refreshes the snapshot with `--update`.

Usage:
    python3 pipeline/drift.py --source <url> --snapshot pipeline/snapshots/release-notes.md --out drift.md
    python3 pipeline/drift.py --source <url> --snapshot pipeline/snapshots/release-notes.md --update

Exit codes:
    0 - ran to completion (whether or not anything changed)
    1 - could not fetch the source page (network error, non-200 status)

When the GITHUB_OUTPUT environment variable is set, appends
`changed=true` or `changed=false` to that file.
"""
from __future__ import annotations

import argparse
import difflib
import html.parser
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)
REQUEST_TIMEOUT_SECONDS = 30


class DriftFetchError(Exception):
    """Raised when the source page cannot be fetched."""


class TextExtractor(html.parser.HTMLParser):
    """A minimal HTML to text converter for diffing purposes: drops script
    and style content, and keeps headings and list items on their own
    line so a new release note item shows as one changed line, not a
    reflowed paragraph."""

    SKIP_TAGS = {"script", "style", "noscript", "svg"}
    LINE_BREAK_TAGS = {
        "p", "div", "section", "article", "li", "tr", "table", "ul", "ol",
        "br", "h1", "h2", "h3", "h4", "h5", "h6",
    }

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.chunks: list[str] = []
        self._skip_depth = 0

    def handle_starttag(self, tag: str, attrs) -> None:
        if tag in self.SKIP_TAGS:
            self._skip_depth += 1
        if tag in self.LINE_BREAK_TAGS:
            self.chunks.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag in self.SKIP_TAGS and self._skip_depth > 0:
            self._skip_depth -= 1
        if tag in self.LINE_BREAK_TAGS:
            self.chunks.append("\n")

    def handle_data(self, data: str) -> None:
        if self._skip_depth == 0:
            self.chunks.append(data)

    def text(self) -> str:
        raw = "".join(self.chunks)
        raw = re.sub(r"[ \t]+", " ", raw)
        raw = re.sub(r" *\n *", "\n", raw)
        lines = [line.strip() for line in raw.splitlines()]
        lines = [line for line in lines if line]
        return "\n".join(lines) + "\n"


def fetch_text(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT_SECONDS) as resp:
            if resp.status != 200:
                raise DriftFetchError(f"unexpected status {resp.status} fetching {url}")
            body = resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        raise DriftFetchError(f"HTTP {e.code} fetching {url}") from e
    except (urllib.error.URLError, OSError, TimeoutError) as e:
        raise DriftFetchError(f"could not reach {url}: {e}") from e

    extractor = TextExtractor()
    extractor.feed(body)
    return extractor.text()


def render_drift_md(source: str, snapshot_path: Path, previous: str | None, current: str) -> str:
    diff_lines = list(
        difflib.unified_diff(
            (previous or "").splitlines(),
            current.splitlines(),
            fromfile=str(snapshot_path),
            tofile=source,
            lineterm="",
        )
    )
    diff_text = "\n".join(diff_lines) if diff_lines else "(snapshot was missing; nothing to diff against)"
    return (
        "# Catalogue drift: Claude release notes changed\n\n"
        f"`{source}` differs from the last snapshot (`{snapshot_path}`).\n\n"
        f"```diff\n{diff_text}\n```\n\n"
        "Update `pipeline/catalogue.yaml` for anything new, then refresh the snapshot with "
        f"`python pipeline/drift.py --source {source} --snapshot {snapshot_path} --update` and commit it.\n"
    )


def write_github_output(changed: bool) -> None:
    path = os.environ.get("GITHUB_OUTPUT")
    if not path:
        return
    with open(path, "a", encoding="utf-8") as f:
        f.write(f"changed={'true' if changed else 'false'}\n")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--source", required=True, help="URL to fetch and diff")
    parser.add_argument("--snapshot", required=True, type=Path, help="path to the committed snapshot")
    parser.add_argument("--out", default="drift.md", help="where to write the drift report (default drift.md)")
    parser.add_argument("--update", action="store_true", help="overwrite the snapshot with the current fetch and exit")
    args = parser.parse_args()

    try:
        current = fetch_text(args.source)
    except DriftFetchError as e:
        print(f"drift: {e}", file=sys.stderr)
        return 1

    if args.update:
        args.snapshot.parent.mkdir(parents=True, exist_ok=True)
        args.snapshot.write_text(current, encoding="utf-8")
        print(f"drift: snapshot updated at {args.snapshot}")
        return 0

    previous = args.snapshot.read_text(encoding="utf-8") if args.snapshot.exists() else None
    changed = previous is None or previous != current
    write_github_output(changed)

    if changed:
        out_path = Path(args.out)
        out_path.write_text(render_drift_md(args.source, args.snapshot, previous, current), encoding="utf-8")
        reason = "snapshot missing" if previous is None else "content changed"
        print(f"drift: changed ({reason}), wrote {out_path}")
    else:
        print("drift: no change")

    return 0


if __name__ == "__main__":
    sys.exit(main())
