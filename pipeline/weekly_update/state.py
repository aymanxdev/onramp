"""Per-source snapshots, the new-item diff, changelog aggregation and the
source-health counters. Pure functions plus small JSON file helpers."""
from __future__ import annotations

import json
from pathlib import Path

from .sources import Item, Source

HEALTH_ISSUE_THRESHOLD = 2


# ---------------------------------------------------------------------------
# Snapshots
# ---------------------------------------------------------------------------

def snapshot_path(directory: Path, source_id: str) -> Path:
    return Path(directory) / f"{source_id}.json"


def load_snapshot(directory: Path, source_id: str) -> dict | None:
    """The committed snapshot for a source, or None when there is none yet."""
    path = snapshot_path(directory, source_id)
    if not path.is_file():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        known = {entry["key"] for entry in data["items"]}
    except (OSError, ValueError, KeyError, TypeError) as e:
        raise ValueError(f"snapshot {path} is unreadable: {e}") from e
    return {"source": source_id, "items": data["items"], "keys": known}


def merge_snapshot(previous: dict | None, items: list[Item]) -> list[dict]:
    """Union of the old snapshot entries and the current items, newest first and
    stable, so a seed or a merged update changes only the lines that are new."""
    by_key: dict[str, dict] = {}
    if previous:
        for entry in previous["items"]:
            by_key[entry["key"]] = entry
    for it in items:
        by_key[it["key"]] = {"key": it["key"], "date": it["date"], "title": it["title"]}
    return sorted(by_key.values(), key=lambda e: (e.get("date") or "", e["key"]), reverse=True)


def write_snapshot(directory: Path, source_id: str, entries: list[dict]) -> Path:
    path = snapshot_path(directory, source_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {"source": source_id, "items": entries}
    path.write_text(json.dumps(payload, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    return path


def new_items(snapshot: dict | None, items: list[Item]) -> list[Item]:
    """Items whose key is absent from the snapshot. With no snapshot nothing is
    'new': the caller must seed instead of proposing a source's whole history."""
    if snapshot is None:
        return []
    return [it for it in items if it["key"] not in snapshot["keys"]]


def aggregate_changelog(source: Source, fresh: list[Item]) -> list[Item]:
    """A changelog-kind source ships many small versions a week, so everything new
    becomes one item per run: dated and linked to the newest version."""
    if len(fresh) <= 1:
        return list(fresh)
    ordered = sorted(fresh, key=lambda it: it["date"] or "", reverse=True)
    newest, oldest = ordered[0], ordered[-1]
    short = lambda title: title.split()[-1]  # noqa: E731 - "Claude Code 2.1.296" -> "2.1.296"
    prefix = newest["title"].rsplit(" ", 1)[0] if " " in newest["title"] else source.name
    body = "\n\n".join(f"{it['title']} ({it['date'] or 'undated'}):\n{it['text']}" for it in fresh[:3])
    return [{
        "key": newest["key"],
        "title": f"{prefix} {short(oldest['title'])} to {short(newest['title'])}",
        "date": newest["date"],
        "url": newest["url"],
        "text": body[:3000],
        "aggregate": True,
        "count": len(fresh),
    }]


# ---------------------------------------------------------------------------
# Source health
# ---------------------------------------------------------------------------

def load_health(path: Path | None) -> dict:
    if path is None or not Path(path).is_file():
        return {"sources": {}}
    try:
        data = json.loads(Path(path).read_text(encoding="utf-8"))
        if isinstance(data, dict) and isinstance(data.get("sources"), dict):
            return data
    except (OSError, ValueError):
        pass
    return {"sources": {}}


def update_health(health: dict, outcomes: dict[str, str | None]) -> dict:
    """Apply one run. `outcomes` maps source id to an error string or None.
    Returns {"health": new_health, "needsIssue": [...], "recovered": [...]}."""
    previous = health.get("sources", {})
    sources: dict[str, dict] = {}
    needs_issue: list[str] = []
    recovered: list[str] = []
    for sid, error in outcomes.items():
        before = int(previous.get(sid, {}).get("consecutiveFailures", 0))
        if error is None:
            sources[sid] = {"consecutiveFailures": 0}
            if before >= HEALTH_ISSUE_THRESHOLD:
                recovered.append(sid)
        else:
            count = before + 1
            sources[sid] = {"consecutiveFailures": count, "lastError": error[:300]}
            if count >= HEALTH_ISSUE_THRESHOLD:
                needs_issue.append(sid)
    return {"health": {"sources": sources}, "needsIssue": needs_issue, "recovered": recovered}


def save_health(path: Path, health: dict) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(health, indent=1, sort_keys=True) + "\n", encoding="utf-8")
