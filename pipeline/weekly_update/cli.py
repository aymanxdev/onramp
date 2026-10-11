"""Weekly update entry point.

    python -m pipeline.weekly_update run --out <dir> [--seed] [--health <file>] [--dry-run]

Fetches every source in pipeline/sources.yaml, finds the items not yet in the
committed snapshots, drafts catalogue entries for them (through the bundled
scripts/weekly-update/draft.ts), splices them into pipeline/catalogue.yaml,
validates the result, and writes the pull request title and body to --out.

Fetch and parse problems are collected per source and never raised. The exit
status is 0 unless this job's own code crashes. Standard library plus PyYAML.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import os
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Callable
from zoneinfo import ZoneInfo

import yaml

from . import report, state, writer
from .sources import Source, fetch, fetch_source, load_sources

REPO = Path(__file__).resolve().parents[2]
DEFAULT_BUNDLE = REPO / "scripts" / "weekly-update" / "dist" / "draft.mjs"
MODEL_CALL_CAP = 20
DRAFT_TIMEOUT_SECONDS = 20 * 60


class CliError(Exception):
    """The job's own code cannot continue (not a source problem)."""


def uk_today() -> str:
    return datetime.now(ZoneInfo("Europe/London")).date().isoformat()


def _load_validator():
    spec = importlib.util.spec_from_file_location("onramp_validate", REPO / "pipeline" / "validate.py")
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def known_catalogue(cat: dict) -> dict:
    return {
        "surfaces": [{"id": s["id"], "plans": list(s.get("plans") or [])} for s in cat.get("surfaces") or []],
        "capabilities": [c["id"] for c in cat.get("capabilities") or []],
        "featureIds": [f["id"] for f in cat.get("features") or []],
    }


def run_draft(items_path: Path, known_path: Path, out_path: Path, date: str, bundle: Path, node: str, stubs_only: bool) -> dict:
    if not bundle.is_file():
        raise CliError(f"draft bundle missing at {bundle}; build it with: pnpm --dir app weekly:draft:build")
    cmd = [node, str(bundle), "--items", str(items_path), "--known", str(known_path),
           "--date", date, "--out", str(out_path), "--cap", str(MODEL_CALL_CAP)]
    if stubs_only:
        cmd.append("--stubs-only")
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=DRAFT_TIMEOUT_SECONDS, check=False)
    except (OSError, subprocess.TimeoutExpired) as e:
        raise CliError(f"could not run the draft script: {e}") from e
    if proc.returncode != 0:
        raise CliError(f"draft script failed: {proc.stderr.strip() or proc.stdout.strip()}")
    print(proc.stdout.strip())
    return json.loads(out_path.read_text(encoding="utf-8"))


def collect(sources: list[Source], fetcher: Callable[[str], str]) -> dict[str, dict]:
    results: dict[str, dict] = {}
    for src in sources:
        items, error = fetch_source(src, fetcher)
        results[src.id] = {"source": src, "items": items, "error": error}
        status = f"ERROR {error}" if error else f"{len(items)} items"
        print(f"fetch: {src.id}: {status}")
    return results


def run(args: argparse.Namespace, fetcher: Callable[[str], str] = fetch) -> int:
    date = args.date or uk_today()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    sources = load_sources(Path(args.sources))
    catalogue_path = Path(args.catalogue)
    snapshots_dir = Path(args.snapshots)

    # A dry run works on copies, so tracked files are never modified.
    if args.dry_run:
        work = out / "dry-run"
        if work.exists():
            shutil.rmtree(work)
        work.mkdir(parents=True)
        shutil.copy(catalogue_path, work / "catalogue.yaml")
        if snapshots_dir.is_dir():
            shutil.copytree(snapshots_dir, work / "snapshots")
        else:
            (work / "snapshots").mkdir()
        catalogue_path, snapshots_dir = work / "catalogue.yaml", work / "snapshots"

    results = collect(sources, fetcher)
    errors = {sid: r["error"] for sid, r in results.items() if r["error"]}

    health_update = state.update_health(
        state.load_health(Path(args.health) if args.health else None),
        {sid: r["error"] for sid, r in results.items()},
    )
    if args.health and not args.dry_run:
        state.save_health(Path(args.health), health_update["health"])

    ok = {sid: r for sid, r in results.items() if not r["error"]}
    per_source = {sid: {"items": len(r["items"]), "new": 0, "error": r["error"]} for sid, r in results.items()}

    def write_snapshots() -> None:
        for sid, r in ok.items():
            previous = state.load_snapshot(snapshots_dir, sid)
            state.write_snapshot(snapshots_dir, sid, state.merge_snapshot(previous, r["items"]))

    # Seed mode: record everything, propose nothing -----------------------------------
    if args.seed:
        write_snapshots()
        title = report.title_for(date, 0, seeded=True)
        body = report.render_body(
            date=date, items=[], drafts=None, errors=errors,
            source_names={s.id: s.name for s in sources}, surfaces=[], seeded_sources=[], seeded=True,
            issue_sources=health_update["needsIssue"], validation_note=None,
        )
        return finish(out, date, title, body, [], per_source, errors, health_update, seeded=True,
                      drafts=None, dry_run=args.dry_run, changed=True, validation_fallback=None)

    # Diff ------------------------------------------------------------------------------
    new_list: list[dict] = []
    seeded_sources: list[str] = []
    for src in sources:
        r = ok.get(src.id)
        if r is None:
            continue
        snapshot = state.load_snapshot(snapshots_dir, src.id)
        if snapshot is None:
            seeded_sources.append(src.id)  # a source with no snapshot yet is seeded, not proposed
            continue
        fresh = state.new_items(snapshot, r["items"])
        per_source[src.id]["new"] = len(fresh)
        if src.kind == "changelog":
            fresh = state.aggregate_changelog(src, fresh)
        for it in fresh:
            new_list.append({**it, "sourceId": src.id, "sourceName": src.name, "kind": src.kind})

    if not new_list:
        # Nothing to propose. Only a source seen for the first time changes any file.
        for sid in seeded_sources:
            state.write_snapshot(snapshots_dir, sid, state.merge_snapshot(None, ok[sid]["items"]))
        body = ""
        if seeded_sources:
            body = report.render_body(
                date=date, items=[], drafts=None, errors=errors,
                source_names={s.id: s.name for s in sources}, surfaces=[], seeded_sources=seeded_sources,
                seeded=False, issue_sources=health_update["needsIssue"], validation_note=None,
            )
        return finish(out, date, report.title_for(date, 0), body, [], per_source, errors, health_update,
                      seeded=False, drafts=None, dry_run=args.dry_run, changed=bool(seeded_sources),
                      validation_fallback=None, seeded_sources=seeded_sources)

    # Draft, write, validate --------------------------------------------------------------
    original = catalogue_path.read_text(encoding="utf-8")
    cat = yaml.safe_load(original)
    items_path, known_path, drafts_path = out / "new-items.json", out / "known.json", out / "drafts.json"
    items_path.write_text(json.dumps(new_list, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    known_path.write_text(json.dumps(known_catalogue(cat), indent=1) + "\n", encoding="utf-8")

    validator = _load_validator()
    bundle = Path(args.draft_bundle)
    validation_fallback: str | None = None
    stubs_only = False
    while True:
        drafts = run_draft(items_path, known_path, drafts_path, date, bundle, args.node, stubs_only)
        updated = writer.apply_drafts(original, drafts["drafts"])
        problems = validator.validate(yaml.safe_load(updated), ["officialUrl", "asOf"])
        if not problems:
            break
        if stubs_only:
            raise CliError("catalogue validation fails even with stub drafts:\n  " + "\n  ".join(problems.items[:10]))
        validation_fallback = "; ".join(problems.items[:3])
        stubs_only = True

    catalogue_path.write_text(updated, encoding="utf-8")
    write_snapshots()
    surfaces = [{"id": s["id"], "name": s["name"]} for s in cat.get("surfaces") or []]
    title = report.title_for(date, len(new_list))
    body = report.render_body(
        date=date, items=new_list, drafts=drafts, errors=errors,
        source_names={s.id: s.name for s in sources}, surfaces=surfaces, seeded_sources=seeded_sources,
        seeded=False, issue_sources=health_update["needsIssue"], validation_note=validation_fallback,
    )
    return finish(out, date, title, body, new_list, per_source, errors, health_update, seeded=False,
                  drafts=drafts, dry_run=args.dry_run, changed=True, validation_fallback=validation_fallback,
                  seeded_sources=seeded_sources)


def finish(out: Path, date: str, title: str, body: str, new_list: list[dict], per_source: dict, errors: dict,
           health_update: dict, *, seeded: bool, drafts: dict | None, dry_run: bool, changed: bool,
           validation_fallback: str | None, seeded_sources: list[str] | None = None) -> int:
    summary = {
        "date": date,
        "title": title,
        "newItems": len(new_list),
        "seeded": seeded,
        "changed": changed,
        "dryRun": dry_run,
        "failedSources": sorted(errors),
        "sourceProblemIssue": health_update["needsIssue"],
        "recoveredSources": health_update["recovered"],
        "newlySeededSources": seeded_sources or [],
        "modelCalls": drafts["modelCalls"] if drafts else 0,
        "validationFellBackToStubs": validation_fallback is not None,
        "sources": per_source,
    }
    (out / "summary.json").write_text(json.dumps(summary, indent=1) + "\n", encoding="utf-8")
    if body:
        (out / "pr-title.txt").write_text(title + "\n", encoding="utf-8")
        (out / "pr-body.md").write_text(body, encoding="utf-8")
        print(f"\nTITLE: {title}\n\n{body}")
    else:
        for name in ("pr-title.txt", "pr-body.md"):
            (out / name).unlink(missing_ok=True)
        print("weekly-update: nothing new, no pull request needed")
    print("SUMMARY " + json.dumps({k: v for k, v in summary.items() if k != "sources"}))
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="python -m pipeline.weekly_update", description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="command", required=True)
    r = sub.add_parser("run", help="fetch, diff, draft and write the weekly update")
    r.add_argument("--out", required=True, help="directory for the title, body, summary and intermediate files")
    r.add_argument("--seed", action="store_true", help="record all current items as known; draft nothing")
    r.add_argument("--health", help="source-health.json carried between runs (actions/cache)")
    r.add_argument("--dry-run", action="store_true", help="work on temporary copies; change no tracked file")
    r.add_argument("--date", help="override the run date (YYYY-MM-DD); defaults to today in UK time")
    r.add_argument("--sources", default=str(REPO / "pipeline" / "sources.yaml"))
    r.add_argument("--catalogue", default=str(REPO / "pipeline" / "catalogue.yaml"))
    r.add_argument("--snapshots", default=str(REPO / "pipeline" / "snapshots"))
    r.add_argument("--draft-bundle", default=str(DEFAULT_BUNDLE))
    r.add_argument("--node", default=os.environ.get("NODE", "node"))
    return p


def main(argv: list[str] | None = None, fetcher: Callable[[str], str] = fetch) -> int:
    args = build_parser().parse_args(argv)
    try:
        return run(args, fetcher)
    except CliError as e:
        print(f"weekly-update: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
