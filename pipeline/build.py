#!/usr/bin/env python3
"""Reads pipeline/catalogue.yaml, optionally overlays a Graphify run, and
writes every generated artefact the app and the edge function read at
runtime. Python 3.10+, PyYAML only.

Outputs (all under the repo root):
    app/public/data/catalogue.json
    app/public/data/graph.json
    app/public/data/changelog.json
    app/public/feed.xml
    app/public/feed.json
    app/public/radar.ics

Usage:
    python3 pipeline/build.py
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from xml.sax.saxutils import escape

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))
import merge  # noqa: E402  (local import, path adjusted above)

REPO_ROOT = Path(__file__).resolve().parent.parent
CATALOGUE_YAML = REPO_ROOT / "pipeline" / "catalogue.yaml"
GRAPHIFY_OUT = REPO_ROOT / "pipeline" / "graphify-out" / "graph.json"
DATA_DIR = REPO_ROOT / "app" / "public" / "data"
PUBLIC_DIR = REPO_ROOT / "app" / "public"

PLAN_ORDER = ["free", "pro", "max", "team", "enterprise"]
COWORK_ONLY_CAPABILITIES = {"dispatch", "scheduled-tasks", "computer-use"}


def load_catalogue() -> dict:
    with open(CATALOGUE_YAML, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def dump_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, sort_keys=True, ensure_ascii=False)
        f.write("\n")


# ---------------------------------------------------------------------------
# catalogue.json: the catalogue, flattened as-is (it is already flat). A
# feature's optional `image` (src, alt, credit) passes through untouched here;
# validate.py is what checks it against pipeline/README.md's rules.
# ---------------------------------------------------------------------------

def build_catalogue_json(catalogue: dict) -> dict:
    return catalogue


# ---------------------------------------------------------------------------
# graph.json
# ---------------------------------------------------------------------------

def cheapest_plan(plans: list[str]) -> str | None:
    ranked = [p for p in PLAN_ORDER if p in plans]
    return ranked[0] if ranked else None


def first_route_surface_for(usecases: list[dict], node_id: str, field: str) -> str | None:
    """The surface of the first usecase (in file order) that references
    node_id in one of its capabilities / connectors / skills lists. This is
    the "first route" a connector, skill or plugin belongs to, since those
    node types have no direct surface field of their own."""
    for u in usecases:
        if node_id in (u.get(field) or []):
            routes = u.get("routes") or []
            if routes:
                return routes[0]["surface"]
    return None


def nid(node_type: str, ref: str) -> str:
    """Graph node ids are `<type>:<ref>` because catalogue ids are only unique
    within their own kind: `slack` is both a surface and a connector,
    `dispatch` both a capability and a feature, `brand-guidelines` both a
    skill and a usecase. The original catalogue id survives on the node as
    `ref` for anything that needs to look the entity back up in the
    catalogue."""
    return f"{node_type}:{ref}"


def build_graph(catalogue: dict, overlay_edges: list[dict]) -> dict:
    surfaces = catalogue.get("surfaces") or []
    capabilities = catalogue.get("capabilities") or []
    connectors = catalogue.get("connectors") or []
    skills = catalogue.get("skills") or []
    plans = catalogue.get("plans") or []
    usecases = catalogue.get("usecases") or []
    features = catalogue.get("features") or []

    surface_by_id = {s["id"]: s for s in surfaces}
    skill_kind_by_id = {sk["id"]: sk.get("kind", "skill") for sk in skills}

    nodes: list[dict] = []
    edges: list[dict] = []

    def add_node(node: dict) -> None:
        # Drop keys with no value so the JSON stays tidy and diffs stay small.
        nodes.append({k: v for k, v in node.items() if v not in (None, "")})

    def add_edge(source: str, target: str, etype: str, weight: int | None = None,
                 confidence: str | None = None) -> None:
        edge = {"source": source, "target": target, "type": etype}
        if weight is not None:
            edge["weight"] = weight
        if confidence is not None:
            edge["confidence"] = confidence
        edges.append(edge)

    # Nodes -----------------------------------------------------------
    for s in surfaces:
        add_node({"id": nid("surface", s["id"]), "ref": s["id"], "type": "surface", "name": s["name"],
                  "surface": s["id"], "tint": s.get("tint"), "officialUrl": s.get("officialUrl"),
                  "caption": s.get("caption")})

    for c in capabilities:
        owning = (c.get("availableOn") or [None])[0]
        tint = surface_by_id.get(owning, {}).get("tint") if owning else None
        add_node({"id": nid("capability", c["id"]), "ref": c["id"], "type": "capability", "name": c["name"],
                  "surface": owning, "tint": tint, "shippedOn": c.get("shippedOn"), "officialUrl": c.get("officialUrl")})

    for c in connectors:
        owning = first_route_surface_for(usecases, c["id"], "connectors")
        tint = surface_by_id.get(owning, {}).get("tint") if owning else None
        add_node({"id": nid("connector", c["id"]), "ref": c["id"], "type": "connector", "name": c["name"],
                  "surface": owning, "tint": tint, "officialUrl": c.get("officialUrl")})

    for sk in skills:
        owning = first_route_surface_for(usecases, sk["id"], "skills")
        tint = surface_by_id.get(owning, {}).get("tint") if owning else None
        kind = sk.get("kind", "skill")
        add_node({"id": nid(kind, sk["id"]), "ref": sk["id"], "type": kind, "name": sk["name"],
                  "surface": owning, "tint": tint, "officialUrl": sk.get("officialUrl")})

    for p in plans:
        add_node({"id": nid("plan", p["id"]), "ref": p["id"], "type": "plan", "name": p["name"],
                  "officialUrl": p.get("officialUrl")})

    for u in usecases:
        routes = u.get("routes") or []
        owning = routes[0]["surface"] if routes else None
        tint = surface_by_id.get(owning, {}).get("tint") if owning else None
        add_node({"id": nid("usecase", u["id"]), "ref": u["id"], "type": "usecase", "name": u["title"],
                  "surface": owning, "tint": tint})

    for f in features:
        owning = (f.get("surface") or [None])[0]
        tint = surface_by_id.get(owning, {}).get("tint") if owning else None
        add_node({"id": nid("feature", f["id"]), "ref": f["id"], "type": "feature", "name": f["name"],
                  "surface": owning, "tint": tint, "shippedOn": f.get("shippedOn"), "officialUrl": f.get("officialUrl")})

    # Edges -------------------------------------------------------------
    seen_edges: set[tuple] = set()

    def add_edge_dedup(source: str, target: str, etype: str, weight: int | None = None) -> None:
        key = (source, target, etype, weight)
        if key in seen_edges:
            return
        seen_edges.add(key)
        add_edge(source, target, etype, weight)

    # available_on: capability/skill -> surface
    for c in capabilities:
        for sid in c.get("availableOn") or []:
            add_edge_dedup(nid("capability", c["id"]), nid("surface", sid), "available_on")
    for sk in skills:
        kind = sk.get("kind", "skill")
        for sid in sk.get("installsOn") or []:
            add_edge_dedup(nid(kind, sk["id"]), nid("surface", sid), "available_on")

    # requires: surface -> cheapest plan
    for s in surfaces:
        plan = cheapest_plan(s.get("plans") or [])
        if plan:
            add_edge_dedup(nid("surface", s["id"]), nid("plan", plan), "requires")

    # requires: capability -> surface, for the Cowork-only capabilities
    for c in capabilities:
        if c["id"] in COWORK_ONLY_CAPABILITIES:
            for sid in c.get("availableOn") or []:
                add_edge_dedup(nid("capability", c["id"]), nid("surface", sid), "requires")

    # unlocks: connector/skill -> usecase
    for u in usecases:
        for cid in u.get("connectors") or []:
            add_edge_dedup(nid("connector", cid), nid("usecase", u["id"]), "unlocks")
        for sid in u.get("skills") or []:
            kind = skill_kind_by_id.get(sid, "skill")
            add_edge_dedup(nid(kind, sid), nid("usecase", u["id"]), "unlocks")

    # good_for: surface -> usecase, weighted by the route
    for u in usecases:
        for r in u.get("routes") or []:
            add_edge_dedup(nid("surface", r["surface"]), nid("usecase", u["id"]), "good_for", weight=r.get("weight"))

    # alternative_to: alternative surface -> recommended surface
    for u in usecases:
        routes = u.get("routes") or []
        alt = u.get("alternative") or {}
        if routes and alt.get("surface"):
            add_edge_dedup(nid("surface", alt["surface"]), nid("surface", routes[0]["surface"]), "alternative_to")

    # introduces: feature -> capability
    for f in features:
        for cid in f.get("introduces") or []:
            add_edge_dedup(nid("feature", f["id"]), nid("capability", cid), "introduces")

    # Graphify overlay: EXTRACTED edges between nodes we already know about.
    # Overlay edges carry bare catalogue ids with no type tag, so they can
    # only be resolved when a ref is unambiguous (not one of the ids shared
    # across two node kinds); ambiguous refs are dropped rather than guessed.
    ref_to_ids: dict[str, list[str]] = {}
    for n in nodes:
        ref_to_ids.setdefault(n["ref"], []).append(n["id"])
    for e in overlay_edges:
        source_ids = ref_to_ids.get(e["source"], [])
        target_ids = ref_to_ids.get(e["target"], [])
        if len(source_ids) != 1 or len(target_ids) != 1:
            continue
        source_id, target_id = source_ids[0], target_ids[0]
        key = (source_id, target_id, e["type"], e.get("weight"))
        if key not in seen_edges:
            seen_edges.add(key)
            add_edge(source_id, target_id, e["type"], e.get("weight"), e.get("confidence"))

    nodes.sort(key=lambda n: (n["type"], n["id"]))
    edges.sort(key=lambda e: (e["type"], e["source"], e["target"]))

    return {
        "version": catalogue.get("version"),
        "builtAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "nodes": nodes,
        "edges": edges,
    }


# ---------------------------------------------------------------------------
# changelog.json
# ---------------------------------------------------------------------------

def build_changelog(catalogue: dict) -> list[dict]:
    items = list(catalogue.get("changelog") or [])
    items.sort(key=lambda i: i["date"], reverse=True)
    return items


# ---------------------------------------------------------------------------
# Feeds and the Radar calendar
# ---------------------------------------------------------------------------

def site_url() -> str:
    return os.environ.get("VITE_SITE_URL", "https://onramp.example").rstrip("/")


def rfc822(date_str: str) -> str:
    dt = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    return dt.strftime("%a, %d %b %Y 00:00:00 +0000")


def published_features(catalogue: dict) -> list[dict]:
    feats = [f for f in (catalogue.get("features") or []) if f.get("status") == "published"]
    feats.sort(key=lambda f: f["shippedOn"], reverse=True)
    return feats


def build_feed_xml(catalogue: dict) -> str:
    base = site_url()
    feats = published_features(catalogue)
    items = []
    for f in feats:
        items.append(
            "    <item>\n"
            f"      <title>{escape(f['name'])}</title>\n"
            f"      <link>{escape(f['officialUrl'])}</link>\n"
            f"      <guid isPermaLink=\"false\">{escape(f['id'])}</guid>\n"
            f"      <pubDate>{rfc822(f['shippedOn'])}</pubDate>\n"
            f"      <description>{escape(f['plainWords'])}</description>\n"
            "    </item>"
        )
    items_xml = "\n".join(items)
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<rss version="2.0">\n'
        "  <channel>\n"
        "    <title>Onramp Radar</title>\n"
        f"    <link>{escape(base)}/new</link>\n"
        "    <description>Everything Claude shipped, in plain words, newest first.</description>\n"
        f"{items_xml}\n"
        "  </channel>\n"
        "</rss>\n"
    )


def build_feed_json(catalogue: dict) -> dict:
    base = site_url()
    feats = published_features(catalogue)
    items = []
    for f in feats:
        items.append({
            "id": f["id"],
            "url": f["officialUrl"],
            "title": f["name"],
            "content_text": f["plainWords"],
            "date_published": f"{f['shippedOn']}T00:00:00Z",
        })
    return {
        "version": "https://jsonfeed.org/version/1.1",
        "title": "Onramp Radar",
        "home_page_url": f"{base}/new",
        "feed_url": f"{base}/feed.json",
        "items": items,
    }


def build_radar_ics(weeks: int = 12) -> str:
    base = site_url()
    today = datetime.now(timezone.utc).date()
    # If today is already Monday, start today; otherwise the next Monday.
    first_monday = today if today.weekday() == 0 else today + timedelta(days=(7 - today.weekday()))

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Onramp//Radar//EN",
        "CALSCALE:GREGORIAN",
    ]
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    for i in range(weeks):
        monday = first_monday + timedelta(weeks=i)
        next_day = monday + timedelta(days=1)
        year, week, _ = monday.isocalendar()
        card_url = f"{base}/radar/{year}-{week:02d}.png"
        lines += [
            "BEGIN:VEVENT",
            f"UID:radar-{year}-{week:02d}@onramp",
            f"DTSTAMP:{stamp}",
            f"DTSTART;VALUE=DATE:{monday.strftime('%Y%m%d')}",
            f"DTEND;VALUE=DATE:{next_day.strftime('%Y%m%d')}",
            "SUMMARY:Onramp Radar weekly card",
            f"DESCRIPTION:{card_url}",
            f"URL:{card_url}",
            "END:VEVENT",
        ]
    lines.append("END:VCALENDAR")
    return "\r\n".join(lines) + "\r\n"


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    catalogue = load_catalogue()

    graphify_graph = None
    if GRAPHIFY_OUT.exists():
        graphify_graph = merge.load_graphify_output(GRAPHIFY_OUT)
    overlay_edges = merge.overlay(catalogue, existing_edges=[], graphify_graph=graphify_graph)

    catalogue_json = build_catalogue_json(catalogue)
    graph_json = build_graph(catalogue, overlay_edges)
    changelog_json = build_changelog(catalogue)

    dump_json(DATA_DIR / "catalogue.json", catalogue_json)
    dump_json(DATA_DIR / "graph.json", graph_json)
    dump_json(DATA_DIR / "changelog.json", changelog_json)

    (PUBLIC_DIR / "feed.xml").write_text(build_feed_xml(catalogue), encoding="utf-8")
    dump_json(PUBLIC_DIR / "feed.json", build_feed_json(catalogue))
    (PUBLIC_DIR / "radar.ics").write_text(build_radar_ics(), encoding="utf-8")

    print(f"build: {len(graph_json['nodes'])} node(s), {len(graph_json['edges'])} edge(s)")
    print(f"build: {len(catalogue_json['usecases'])} usecase(s), "
          f"{len(catalogue_json['features'])} feature(s)")
    print("build: wrote catalogue.json, graph.json, changelog.json, feed.xml, feed.json, radar.ics")
    return 0


if __name__ == "__main__":
    sys.exit(main())
