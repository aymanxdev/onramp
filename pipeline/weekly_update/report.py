"""Renders the pull request title and body for the weekly update."""
from __future__ import annotations

import re

# Surfaces whose names are ordinary words match too often to be a useful signal.
VAGUE_SURFACES = frozenset({"chat", "code", "design", "word", "api", "mobile"})
MOVEMENT_RE = re.compile(
    r"\b(now available (?:on|in|for)|rolling out|rolls out|comes? to|coming to|expands? to|"
    r"is now in|moving to|moves to|available on)\b",
    re.IGNORECASE,
)


def title_for(date: str, count: int, seeded: bool = False) -> str:
    if seeded:
        return f"[Weekly update] {date}: seed snapshots (0 new items)"
    noun = "item" if count == 1 else "items"
    return f"[Weekly update] {date}: {count} new {noun}"


def route_followups(items: list[dict], surfaces: list[dict]) -> list[tuple[dict, list[str]]]:
    """Items that read like a feature moving to another surface. A heuristic: the
    owner decides whether any route or surface page needs a manual edit."""
    named = [s for s in surfaces if s["id"] not in VAGUE_SURFACES]
    found: list[tuple[dict, list[str]]] = []
    for it in items:
        if it.get("kind") in ("blog", "changelog"):
            continue
        haystack = f"{it['title']}\n{it['text'][:800]}"
        if not MOVEMENT_RE.search(haystack):
            continue
        hits = [s["name"] for s in named if re.search(rf"\b{re.escape(s['name'])}\b", haystack)]
        if hits:
            found.append((it, hits))
    return found


def _link(it: dict) -> str:
    title = re.sub(r"[\[\]|\r\n]+", " ", it["title"]).strip()
    return f"[{title}]({it['url']})"


def render_body(
    *,
    date: str,
    items: list[dict],
    drafts: dict | None,
    errors: dict[str, str],
    source_names: dict[str, str],
    surfaces: list[dict],
    seeded_sources: list[str],
    seeded: bool,
    issue_sources: list[str],
    validation_note: str | None,
) -> str:
    lines: list[str] = []
    out = lines.append
    by_key = {d["key"]: d for d in (drafts or {}).get("drafts", [])}

    if seeded:
        out(f"Seed run on {date}: every source's current items were recorded in `pipeline/snapshots/` "
            "without drafting anything. Merge this so the first scheduled run only proposes what is new after today.")
        out("")
    else:
        out(f"Weekly update for {date}: {len(items)} new item(s). Review the drafts below, confirm the facts "
            "flagged with `# OWNER:` comments in `pipeline/catalogue.yaml`, then merge. Merging publishes.")
        out("")

    if drafts and not seeded:
        stubs = sum(1 for d in drafts["drafts"] if d["mode"] == "stub")
        model = sum(1 for d in drafts["drafts"] if d["mode"] == "model")
        note = f"Drafting: {model} drafted by the model, {stubs} plain stub(s), {drafts['modelCalls']} of {drafts['cap']} model calls used."
        if any("cap" in (d.get("reason") or "") for d in drafts["drafts"]):
            note += " The call cap was reached, so the remaining items got stubs."
        if drafts.get("stubsOnly") and not any(d["mode"] == "model" for d in drafts["drafts"]):
            note += " No AI credentials were used, so every feature is a stub marked `status: draft`."
        out(note)
        out("")

    if validation_note:
        out(f"> Validation fell back to stubs: {validation_note}")
        out("")

    if items and not seeded:
        out("## New items")
        out("")
        out("| Item | Source | Date | Result |")
        out("|---|---|---|---|")
        for it in items:
            d = by_key.get(it["key"], {})
            if d.get("feature"):
                fid = d["feature"]["id"]
                result = f"feature `{fid}` ({d['feature']['status']}) and changelog"
            elif d.get("mode") == "changelog-only":
                result = "changelog only (Claude Code changelog)"
            elif d.get("productChange") is False:
                result = "changelog only, no catalogue change suggested"
            else:
                result = "changelog only"
            date_text = it["date"] or "undated"
            out(f"| {_link(it)} | {source_names.get(it['sourceId'], it['sourceId'])} | {date_text} | {result} |")
        out("")

        features = [d for d in by_key.values() if d.get("feature")]
        if features:
            out("## Facts to confirm")
            out("")
            out("Plans, availability and surface are never decided by the model. Check each against the official page.")
            out("")
            for d in features:
                f = d["feature"]
                surface = f["surface"][0] if f["surface"] else "none chosen"
                plans = ", ".join(f["plans"]) or "none set"
                out(f"- `{f['id']}`: surface {surface}, plans {plans}, status {f['status']}. [Official page]({f['officialUrl']})")
            out("")

        quiet = [it for it in items if by_key.get(it["key"], {}).get("productChange") is False]
        if quiet:
            out("## No catalogue change suggested")
            out("")
            for it in quiet:
                out(f"- {_link(it)}")
            out("")

        follow = route_followups(items, surfaces)
        if follow:
            out("## May affect existing routes")
            out("")
            out("These read like a feature arriving on another surface. They are not edited automatically.")
            out("")
            for it, hits in follow:
                out(f"- {_link(it)} (mentions {', '.join(hits)})")
            out("")

    if seeded_sources and not seeded:
        out("## Newly seeded sources")
        out("")
        out("These sources had no snapshot yet, so their current items were recorded without being proposed: "
            + ", ".join(f"`{s}`" for s in seeded_sources) + ".")
        out("")

    if errors:
        out("## Source problems")
        out("")
        for sid, err in errors.items():
            out(f"- `{sid}`: {err}")
        if issue_sources:
            out("")
            out("Failed two runs in a row: " + ", ".join(f"`{s}`" for s in issue_sources) + ". The source problem issue is updated.")
        out("")

    return "\n".join(lines).rstrip() + "\n"
