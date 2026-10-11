#!/usr/bin/env python3
"""Fills pipeline/radar/weekly-card.html from app/public/data/catalogue.json
and writes the result next to it. Rendering that HTML to a 1080 x 1350 PNG is
Playwright's job in CI; this script only produces the filled markup.

Picks the three highest-weight published features shipped in the last 7
days. If fewer than three shipped that recently, it fills the remaining
slots with the lowest-weight published features not already picked, on the
basis that a low weight is our proxy for "most under-used" since we have no
build-time way to know what a person has actually tried (that state lives in
each visitor's own browser, never on the server).

Usage:
    python3 pipeline/radar/render_weekly_card.py

The address printed on the card comes from the VITE_SITE_URL environment
variable (scheme and trailing slash removed), defaulting to onramp.example.
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
CATALOGUE_JSON = REPO_ROOT / "app" / "public" / "data" / "catalogue.json"
TEMPLATE = Path(__file__).resolve().parent / "weekly-card.html"
OUT_PATH = Path(__file__).resolve().parent / "weekly-card.filled.html"


def site_host() -> str:
    """Mirrors site_url() in pipeline/build.py (same variable and default,
    not imported because build.py pulls in yaml), minus scheme and slash."""
    url = os.environ.get("VITE_SITE_URL", "https://onramp.example").rstrip("/")
    return url.split("://", 1)[-1].rstrip("/")


def pick_features(catalogue: dict, today: datetime | None = None) -> list[dict]:
    today = today or datetime.now(timezone.utc)
    cutoff = today - timedelta(days=7)

    published = [f for f in catalogue.get("features") or [] if f.get("status") == "published"]

    def shipped_on(f: dict) -> datetime:
        return datetime.strptime(f["shippedOn"], "%Y-%m-%d").replace(tzinfo=timezone.utc)

    recent = [f for f in published if shipped_on(f) >= cutoff]
    recent.sort(key=lambda f: f["weight"], reverse=True)

    picked = recent[:3]
    if len(picked) < 3:
        picked_ids = {f["id"] for f in picked}
        rest = [f for f in published if f["id"] not in picked_ids]
        rest.sort(key=lambda f: f["weight"])
        picked += rest[: 3 - len(picked)]

    return picked


def tint_var(tint: str | None) -> str:
    return {
        "chat": "var(--tint-chat)",
        "cowork": "var(--tint-cowork)",
        "code": "var(--tint-code)",
        "design": "var(--tint-design)",
    }.get(tint or "", "var(--accent-action)")


def surface_by_id(catalogue: dict) -> dict:
    return {s["id"]: s for s in catalogue.get("surfaces") or []}


def format_date(iso: str) -> str:
    dt = datetime.strptime(iso, "%Y-%m-%d")
    return dt.strftime("%-d %b %Y")


def week_label(today: datetime) -> str:
    monday = today - timedelta(days=today.weekday())
    return monday.strftime("%-d %b %Y")


def main() -> int:
    with open(CATALOGUE_JSON, "r", encoding="utf-8") as f:
        catalogue = json.load(f)

    today = datetime.now(timezone.utc)
    features = pick_features(catalogue, today)
    surfaces = surface_by_id(catalogue)

    html = TEMPLATE.read_text(encoding="utf-8")
    html = html.replace("{{WEEK_LABEL}}", week_label(today))
    html = html.replace("{{SITE_URL}}", site_host())

    for i in range(3):
        slot = i + 1
        if i < len(features):
            f = features[i]
            surface = surfaces.get((f.get("surface") or [None])[0], {})
            html = html.replace(f"{{{{FEATURE_{slot}_NAME}}}}", f["name"])
            html = html.replace(f"{{{{FEATURE_{slot}_TEXT}}}}", f["plainWords"])
            html = html.replace(f"{{{{FEATURE_{slot}_SURFACE}}}}", surface.get("name", "").upper())
            html = html.replace(f"{{{{FEATURE_{slot}_TINT}}}}", tint_var(surface.get("tint")))
            html = html.replace(f"{{{{FEATURE_{slot}_DATE}}}}", f"shipped {format_date(f['shippedOn'])}")
        else:
            # Fewer than three published features exist at all: leave the
            # slot visibly empty rather than inventing content.
            html = html.replace(f"{{{{FEATURE_{slot}_NAME}}}}", "More on the way")
            html = html.replace(f"{{{{FEATURE_{slot}_TEXT}}}}", "Check back next week.")
            html = html.replace(f"{{{{FEATURE_{slot}_SURFACE}}}}", "")
            html = html.replace(f"{{{{FEATURE_{slot}_TINT}}}}", "var(--bg-subtle)")
            html = html.replace(f"{{{{FEATURE_{slot}_DATE}}}}", "")

    OUT_PATH.write_text(html, encoding="utf-8")
    print(str(OUT_PATH.relative_to(REPO_ROOT)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
