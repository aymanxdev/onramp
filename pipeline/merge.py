#!/usr/bin/env python3
"""The Graphify overlay logic, imported by build.py.

Graphify (https://github.com/Graphify-Labs/graphify, PyPI `graphifyy`) reads the
fetched corpus and writes `pipeline/graphify-out/graph.json` with EXTRACTED,
INFERRED and AMBIGUOUS confidence tags on its edges. This module folds that
output into our own catalogue shape. Only EXTRACTED edges are kept by default,
because inferred and ambiguous edges are guesses that a human has not checked.
Wherever a Graphify edge disagrees with something already in catalogue.yaml,
the curated data wins: Graphify only ever adds, it never overwrites a fact a
person already typed in by hand.

This is a build time tool. Nothing at runtime imports it or depends on it.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

DEFAULT_CONFIDENCE_ALLOW = ("EXTRACTED",)


def load_graphify_output(path: Path) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def filter_edges(graph: dict, allow: tuple[str, ...] = DEFAULT_CONFIDENCE_ALLOW) -> list[dict]:
    edges = graph.get("edges") or []
    return [e for e in edges if e.get("confidence", "EXTRACTED") in allow]


def curated_ids(catalogue: dict) -> set[str]:
    ids: set[str] = set()
    for key in ("surfaces", "capabilities", "connectors", "skills", "plans", "usecases", "features"):
        for item in catalogue.get(key) or []:
            if item.get("id"):
                ids.add(item["id"])
    return ids


def curated_edge_keys(edges: list[dict]) -> set[tuple[str, str, str]]:
    return {(e.get("source", ""), e.get("target", ""), e.get("type", "")) for e in edges}


def overlay(catalogue: dict, existing_edges: list[dict], graphify_graph: dict | None,
            dry_run: bool = False) -> list[dict]:
    """Returns the additional edges Graphify contributes on top of the curated
    ones. Curated wins on conflict: an edge already present (matched on
    source, target, type) is never duplicated or overwritten, and a Graphify
    node id that the curated catalogue does not recognise is dropped, since we
    only want edges between nodes a human has already seeded."""
    if not graphify_graph:
        return []

    known_ids = curated_ids(catalogue)
    already = curated_edge_keys(existing_edges)
    extracted = filter_edges(graphify_graph)

    added: list[dict] = []
    for e in extracted:
        source, target, etype = e.get("source"), e.get("target"), e.get("type")
        if not source or not target or not etype:
            continue
        if source not in known_ids or target not in known_ids:
            continue
        key = (source, target, etype)
        if key in already:
            continue
        added.append({"source": source, "target": target, "type": etype,
                       "weight": e.get("weight"), "confidence": e.get("confidence", "EXTRACTED")})
        already.add(key)

    if dry_run:
        print(f"merge --dry-run: {len(extracted)} EXTRACTED edge(s) in graphify-out, "
              f"{len(added)} new edge(s) would be added on top of the curated graph")
        for e in added:
            print(f"  + {e['source']} --{e['type']}--> {e['target']}")

    return added


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalogue", default="pipeline/catalogue.yaml")
    parser.add_argument("--graphify-out", default="pipeline/graphify-out/graph.json")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    import yaml

    with open(args.catalogue, "r", encoding="utf-8") as f:
        catalogue = yaml.safe_load(f)

    graphify_path = Path(args.graphify_out)
    graphify_graph = load_graphify_output(graphify_path) if graphify_path.exists() else None
    if graphify_graph is None:
        print(f"merge: no Graphify output at {graphify_path}, nothing to overlay")
        return 0

    overlay(catalogue, existing_edges=[], graphify_graph=graphify_graph, dry_run=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
