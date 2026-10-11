"""Comment-preserving insertion of new entries into pipeline/catalogue.yaml.

PyYAML would rewrite the whole file and drop every comment, so each entry is
serialised on its own with yaml.safe_dump and spliced in as text at the end of
the `features:` or `changelog:` list. Existing lines are never touched: the new
text is only ever inserted, and `# OWNER:` comments are emitted above the fields
the owner must confirm."""
from __future__ import annotations

import re

import yaml

TOP = "_top"


class InsertError(Exception):
    pass


def serialise_entry(entry: dict, comments: dict[str, list[str]] | None = None) -> str:
    """One list item as YAML text, with comment lines above the item (key '_top')
    and above individual top-level fields (key = field name)."""
    comments = comments or {}
    dumped = yaml.safe_dump([entry], sort_keys=False, allow_unicode=True, default_flow_style=False, width=100)
    out: list[str] = [f"# {c}" for c in comments.get(TOP, [])]
    for line in dumped.splitlines():
        m = re.match(r"^(?:- |  )([A-Za-z][A-Za-z0-9_]*):", line)
        if m and m[1] in comments and m[1] != TOP:
            out.extend(f"  # {c}" for c in comments[m[1]])
        out.append(line)
    return "\n".join(out) + "\n"


def _section_end(lines: list[str], key: str) -> int:
    """Index at which to insert new items: just after the last line of the list
    under the top-level `key:`, before any blank or comment lines that lead into
    the next section."""
    start = next((i for i, ln in enumerate(lines) if re.match(rf"^{re.escape(key)}:\s*(#.*)?$", ln.rstrip("\r\n"))), None)
    if start is None:
        raise InsertError(f"no top-level '{key}:' list found")
    end = len(lines)
    for i in range(start + 1, len(lines)):
        if re.match(r"^[A-Za-z_][A-Za-z0-9_-]*:", lines[i]):
            end = i
            break
    while end > start + 1 and (lines[end - 1].strip() == "" or lines[end - 1].startswith("#")):
        end -= 1
    return end


def insert_entries(text: str, section: str, blocks: list[str]) -> str:
    """Insert already serialised blocks at the end of the `section` list."""
    if not blocks:
        return text
    lines = text.splitlines(keepends=True)
    at = _section_end(lines, section)
    if at > 0 and not lines[at - 1].endswith("\n"):
        lines[at - 1] += "\n"
    lines[at:at] = [b if b.endswith("\n") else b + "\n" for b in blocks]
    return "".join(lines)


def apply_drafts(text: str, drafts: list[dict]) -> str:
    """Add each draft's feature (if any) and changelog entry. Drafts are the items
    of drafts.json written by scripts/weekly-update/draft.ts."""
    features = [
        serialise_entry(d["feature"], d.get("featureComments"))
        for d in drafts
        if d.get("feature")
    ]
    changelog = [
        serialise_entry(d["changelog"], d.get("changelogComments"))
        for d in drafts
        if d.get("changelog")
    ]
    text = insert_entries(text, "features", features)
    return insert_entries(text, "changelog", changelog)
