#!/usr/bin/env python3
"""Validates pipeline/catalogue.yaml against the schema described in
app/src/features/catalogue/types.ts. Python 3.10+, PyYAML only.

Usage:
    python3 pipeline/validate.py pipeline/catalogue.yaml
    python3 pipeline/validate.py --require officialUrl,asOf pipeline/catalogue.yaml

Exits 1 and prints every problem found (not just the first) when the catalogue
is invalid. Exits 0 and prints a short summary when it is clean.
"""
from __future__ import annotations

import argparse
import re
import sys
from datetime import date
from pathlib import Path
from urllib.parse import urlparse

import yaml

# Parser names live next to the parsers themselves; importing them keeps the two in step.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from weekly_update.sources import PARSER_NAMES  # noqa: E402

# Resolved relative to this file, not the caller's cwd, so `image.src` existence
# checks work whether validate.py is run from the repo root or from pipeline/.
APP_PUBLIC_DIR = Path(__file__).resolve().parent.parent / "app" / "public"

ALLOWED_HOSTS = (
    "claude.com",
    "claude.ai",
    "anthropic.com",
    "docs.claude.com",
    "support.claude.com",
    "code.claude.com",
    "claude.dev",
)

SOURCE_KINDS = ("release-notes", "blog", "news", "changelog")

DASH_RE = re.compile("[–—]")
ISO_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
PLACEHOLDER_RE = re.compile(r"\{\{(\w+)\}\}")

SURFACE_IDS = {
    "chat", "cowork", "code", "design", "chrome", "excel", "powerpoint",
    "word", "outlook", "slack", "mobile", "api",
}
TINTS = {"chat", "cowork", "code", "design", "neutral"}
PLAN_IDS = {"free", "pro", "max", "team", "enterprise"}
GROUPS = {"Everyday work", "Making things", "In your tools", "For builders"}
PERSONAS = {
    "solo founder", "marketer", "engineer", "designer", "ops or admin",
    "student", "analyst", "writer", "small business owner",
}


class Problems:
    def __init__(self) -> None:
        self.items: list[str] = []

    def add(self, where: str, message: str) -> None:
        self.items.append(f"{where}: {message}")

    def __bool__(self) -> bool:
        return bool(self.items)


def is_allowed_host(url: str) -> bool:
    try:
        host = urlparse(url).hostname or ""
    except ValueError:
        return False
    host = host.lower()
    return any(host == root or host.endswith("." + root) for root in ALLOWED_HOSTS)


def check_url(problems: Problems, where: str, url: object) -> None:
    if not isinstance(url, str) or not url:
        problems.add(where, "officialUrl is missing or empty")
        return
    if not url.startswith("https://") and not url.startswith("http://"):
        problems.add(where, f"officialUrl is not a URL: {url!r}")
        return
    if not is_allowed_host(url):
        problems.add(where, f"officialUrl host not allowed: {url!r}")


def check_date(problems: Problems, where: str, field: str, value: object) -> None:
    if not isinstance(value, str) or not ISO_DATE_RE.match(value):
        problems.add(where, f"{field} is not an ISO date (YYYY-MM-DD): {value!r}")
        return
    try:
        date.fromisoformat(value)
    except ValueError:
        problems.add(where, f"{field} is not a real date: {value!r}")


def check_no_dashes(problems: Problems, where: str, value: object) -> None:
    if isinstance(value, str) and DASH_RE.search(value):
        problems.add(where, f"contains an em or en dash: {value!r}")
    elif isinstance(value, list):
        for v in value:
            check_no_dashes(problems, where, v)
    elif isinstance(value, dict):
        for v in value.values():
            check_no_dashes(problems, where, v)


def check_summary(problems: Problems, where: str, summary: object) -> None:
    if not isinstance(summary, str) or not summary:
        problems.add(where, "summary is missing or empty")
        return
    if len(summary) >= 280:
        problems.add(where, f"summary is {len(summary)} chars, must be under 280")


def check_image(problems: Problems, where: str, image: object) -> None:
    """Optional `image` on a feature: owner-supplied artwork for the radar
    story. `src` must live under the owner's own `/radar/img/` folder and the
    file must actually be there; `alt` is required and under 140 chars."""
    if image is None:
        return
    if not isinstance(image, dict):
        problems.add(where, "image must be an object with src and alt")
        return
    src = image.get("src")
    if not isinstance(src, str) or not src.startswith("/radar/img/"):
        problems.add(where, "image.src must start with /radar/img/")
    elif not (APP_PUBLIC_DIR / src.lstrip("/")).is_file():
        problems.add(where, f"image.src {src!r} does not exist under app/public")
    alt = image.get("alt")
    if not isinstance(alt, str) or not alt.strip():
        problems.add(where, "image.alt is missing or empty")
    elif len(alt) >= 140:
        problems.add(where, f"image.alt is {len(alt)} chars, must be under 140")
    check_no_dashes(problems, where, alt if isinstance(alt, str) else None)
    credit = image.get("credit")
    if credit is not None:
        check_no_dashes(problems, where, credit)


def require_fields(problems: Problems, where: str, node: dict, fields: list[str]) -> None:
    """A field is missing when the key is absent, None, or an empty string.
    An empty list is a legitimate value for an array field (e.g. a surface
    with no connectors), so it does not count as missing here; array fields
    that must be non-empty are checked with their own count rules."""
    for f in fields:
        if f not in node or node[f] is None or node[f] == "":
            problems.add(where, f"missing required field {f!r}")


def walk_dashes(problems: Problems, prefix: str, obj: object) -> None:
    check_no_dashes(problems, prefix, obj)


def validate(cat: dict, require: list[str]) -> Problems:
    problems = Problems()

    def req(where: str, node: dict):
        for f in require:
            if f in node and node[f] not in (None, ""):
                continue
            # Feature nodes carry verifiedOn/shippedOn instead of asOf; that
            # satisfies the spirit of "every node has an as-of date".
            if f == "asOf" and node.get("verifiedOn"):
                continue
            problems.add(where, f"--require: missing {f!r}")

    # Top-level scalars ------------------------------------------------
    for f in ("version", "asOf", "linkCheck"):
        if f not in cat:
            problems.add("catalogue", f"missing top level field {f!r}")
    check_date(problems, "catalogue", "asOf", cat.get("asOf"))
    check_date(problems, "catalogue", "linkCheck", cat.get("linkCheck"))

    lighthouse = cat.get("lighthouse") or {}
    for f in ("performance", "accessibility", "bestPractices", "seo"):
        if f not in lighthouse:
            problems.add("catalogue.lighthouse", f"missing {f!r}")

    surfaces = cat.get("surfaces") or []
    capabilities = cat.get("capabilities") or []
    connectors = cat.get("connectors") or []
    skills = cat.get("skills") or []
    plans = cat.get("plans") or []
    usecases = cat.get("usecases") or []
    features = cat.get("features") or []
    changelog = cat.get("changelog") or []
    score_weights = cat.get("scoreWeights") or {}

    # Id uniqueness across each collection ------------------------------
    def check_unique_ids(name: str, items: list[dict]) -> set[str]:
        seen: set[str] = set()
        for item in items:
            i = item.get("id")
            if not i:
                problems.add(name, "item has no id")
                continue
            if i in seen:
                problems.add(name, f"duplicate id {i!r}")
            seen.add(i)
        return seen

    surface_ids = check_unique_ids("surfaces", surfaces)
    capability_ids = check_unique_ids("capabilities", capabilities)
    connector_ids = check_unique_ids("connectors", connectors)
    skill_ids = check_unique_ids("skills", skills)
    plan_ids = check_unique_ids("plans", plans)
    usecase_ids = check_unique_ids("usecases", usecases)
    feature_ids = check_unique_ids("features", features)

    # Surfaces -----------------------------------------------------------
    surface_required = ["id", "name", "summary", "platforms", "plans", "officialUrl", "asOf",
                         "tint", "blurb", "caption", "group", "needs", "unlocks"]
    if len(surface_ids) != 12:
        problems.add("surfaces", f"expected 12 surfaces, found {len(surface_ids)}")
    for s in surfaces:
        where = f"surfaces[{s.get('id')}]"
        require_fields(problems, where, s, surface_required)
        req(where, s)
        if s.get("id") not in SURFACE_IDS:
            problems.add(where, f"unknown surface id {s.get('id')!r}")
        if s.get("tint") not in TINTS:
            problems.add(where, f"invalid tint {s.get('tint')!r}")
        if s.get("group") not in GROUPS:
            problems.add(where, f"invalid group {s.get('group')!r}")
        for p in s.get("plans") or []:
            if p not in PLAN_IDS:
                problems.add(where, f"unknown plan id in plans: {p!r}")
        check_url(problems, where, s.get("officialUrl"))
        check_date(problems, where, "asOf", s.get("asOf"))
        check_summary(problems, where, s.get("summary"))
        caption = s.get("caption")
        if isinstance(caption, str) and len(caption) > 14:
            problems.add(where, f"caption longer than 14 characters: {caption!r}")

    # Capabilities ---------------------------------------------------------
    capability_required = ["id", "name", "summary", "availableOn", "plans", "officialUrl",
                            "asOf", "needs", "unlocks", "weight"]
    if len(capability_ids) < 16:
        problems.add("capabilities", f"expected at least 16, found {len(capability_ids)}")
    for c in capabilities:
        where = f"capabilities[{c.get('id')}]"
        require_fields(problems, where, c, capability_required)
        req(where, c)
        for sid in c.get("availableOn") or []:
            if sid not in surface_ids:
                problems.add(where, f"availableOn references unknown surface {sid!r}")
        for p in c.get("plans") or []:
            if p not in PLAN_IDS:
                problems.add(where, f"unknown plan id in plans: {p!r}")
        w = c.get("weight")
        if not isinstance(w, int) or not (1 <= w <= 10):
            problems.add(where, f"weight must be an integer 1 to 10, got {w!r}")
        check_url(problems, where, c.get("officialUrl"))
        check_date(problems, where, "asOf", c.get("asOf"))
        check_summary(problems, where, c.get("summary"))

    # Connectors -----------------------------------------------------------
    connector_required = ["id", "name", "category", "officialUrl", "asOf", "summary",
                           "needs", "unlocks"]
    if len(connector_ids) < 14:
        problems.add("connectors", f"expected at least 14, found {len(connector_ids)}")
    for c in connectors:
        where = f"connectors[{c.get('id')}]"
        require_fields(problems, where, c, connector_required)
        req(where, c)
        check_url(problems, where, c.get("officialUrl"))
        check_date(problems, where, "asOf", c.get("asOf"))
        check_summary(problems, where, c.get("summary"))

    # Skills / plugins -------------------------------------------------
    skill_required = ["id", "name", "summary", "installsOn", "officialUrl", "asOf", "kind"]
    if len(skill_ids) < 8:
        problems.add("skills", f"expected at least 8, found {len(skill_ids)}")
    for sk in skills:
        where = f"skills[{sk.get('id')}]"
        require_fields(problems, where, sk, skill_required)
        req(where, sk)
        if sk.get("kind") not in ("skill", "plugin"):
            problems.add(where, f"kind must be skill or plugin, got {sk.get('kind')!r}")
        for sid in sk.get("installsOn") or []:
            if sid not in surface_ids:
                problems.add(where, f"installsOn references unknown surface {sid!r}")
        check_url(problems, where, sk.get("officialUrl"))
        check_date(problems, where, "asOf", sk.get("asOf"))
        check_summary(problems, where, sk.get("summary"))

    # Plans ------------------------------------------------------------
    plan_required = ["id", "name", "officialUrl", "asOf", "summary"]
    if len(plan_ids) != 5:
        problems.add("plans", f"expected 5 plans, found {len(plan_ids)}")
    for p in plans:
        where = f"plans[{p.get('id')}]"
        require_fields(problems, where, p, plan_required)
        req(where, p)
        if p.get("id") not in PLAN_IDS:
            problems.add(where, f"unknown plan id {p.get('id')!r}")
        check_url(problems, where, p.get("officialUrl"))
        check_date(problems, where, "asOf", p.get("asOf"))
        check_summary(problems, where, p.get("summary"))

    # Use cases ----------------------------------------------------------
    usecase_required = ["id", "title", "persona", "tags", "intent", "routes", "promptTemplate",
                         "followUps", "pitfalls", "why", "setup", "capabilities", "connectors",
                         "skills", "planNote", "alternative", "extra"]
    if len(usecase_ids) < 40:
        problems.add("usecases", f"expected at least 40, found {len(usecase_ids)}")
    for u in usecases:
        where = f"usecases[{u.get('id')}]"
        require_fields(problems, where, u, usecase_required)
        if u.get("persona") not in PERSONAS:
            problems.add(where, f"unknown persona {u.get('persona')!r}")
        tags = u.get("tags") or []
        if not (3 <= len(tags) <= 6):
            problems.add(where, f"tags must have 3 to 6 items, has {len(tags)}")
        intent = u.get("intent") or []
        if not (8 <= len(intent) <= 16):
            problems.add(where, f"intent must have 8 to 16 items, has {len(intent)}")
        routes = u.get("routes") or []
        if len(routes) < 1:
            problems.add(where, "needs at least one route")
        for r in routes:
            sid = r.get("surface")
            if sid not in surface_ids:
                problems.add(where, f"routes references unknown surface {sid!r}")
            if not isinstance(r.get("weight"), int):
                problems.add(where, f"route weight must be an integer, got {r.get('weight')!r}")
        follow_ups = u.get("followUps") or []
        if len(follow_ups) != 2:
            problems.add(where, f"followUps must have exactly 2 items, has {len(follow_ups)}")
        pitfalls = u.get("pitfalls") or []
        if not (2 <= len(pitfalls) <= 3):
            problems.add(where, f"pitfalls must have 2 or 3 items, has {len(pitfalls)}")
        why = u.get("why") or []
        if len(why) != 3:
            problems.add(where, f"why must have exactly 3 items, has {len(why)}")
        setup = u.get("setup") or []
        if not (3 <= len(setup) <= 4):
            problems.add(where, f"setup must have 3 or 4 steps, has {len(setup)}")
        for s in setup:
            if "text" not in s or not s["text"]:
                problems.add(where, "setup step missing text")
            if "href" not in s and "note" not in s:
                problems.add(where, "setup step needs an href or a note")
            if s.get("href"):
                check_url(problems, where, s.get("href"))
        for cid in u.get("capabilities") or []:
            if cid not in capability_ids:
                problems.add(where, f"capabilities references unknown id {cid!r}")
        for cid in u.get("connectors") or []:
            if cid not in connector_ids:
                problems.add(where, f"connectors references unknown id {cid!r}")
        for sid in u.get("skills") or []:
            if sid not in skill_ids:
                problems.add(where, f"skills references unknown id {sid!r}")
        alt = u.get("alternative") or {}
        if alt.get("surface") not in surface_ids:
            problems.add(where, f"alternative.surface unknown {alt.get('surface')!r}")
        if not alt.get("text"):
            problems.add(where, "alternative.text is missing")
        plan_note = u.get("planNote") or ""
        if "as of 7 September 2026" not in plan_note:
            problems.add(where, "planNote must end with 'as of 7 September 2026'")

        # placeholders: every {{key}} in promptTemplate needs a placeholders entry.
        template = u.get("promptTemplate") or ""
        keys_used = set(PLACEHOLDER_RE.findall(template))
        placeholders = u.get("placeholders") or []
        keys_declared = {p.get("key") for p in placeholders}
        for pl in placeholders:
            for f in ("key", "label", "defaultValue"):
                if f not in pl or pl[f] in (None, ""):
                    problems.add(where, f"placeholders entry missing {f!r}")
        missing = keys_used - keys_declared
        if missing:
            problems.add(where, f"promptTemplate uses {{{{...}}}} keys with no placeholders entry: {sorted(missing)}")
        if not (1 <= len(keys_used) <= 3):
            problems.add(where, f"promptTemplate must use 1 to 3 placeholders, uses {len(keys_used)}")

    # Features -------------------------------------------------------------
    feature_required = ["id", "name", "plainWords", "whatItIs", "whoItIsFor", "forChips",
                         "bullets", "shippedOn", "verifiedOn", "surface", "plans",
                         "officialUrl", "tryPrompt", "pitfalls", "status", "introduces", "weight"]
    for f in features:
        where = f"features[{f.get('id')}]"
        require_fields(problems, where, f, feature_required)
        req(where, f)
        pw = f.get("plainWords") or ""
        if len(pw) >= 120:
            problems.add(where, f"plainWords is {len(pw)} chars, must be under 120")
        for sid in f.get("surface") or []:
            if sid not in surface_ids:
                problems.add(where, f"surface references unknown id {sid!r}")
        for cid in f.get("introduces") or []:
            if cid not in capability_ids:
                problems.add(where, f"introduces references unknown capability {cid!r}")
        if f.get("status") not in ("draft", "published"):
            problems.add(where, f"status must be draft or published, got {f.get('status')!r}")
        check_url(problems, where, f.get("officialUrl"))
        check_date(problems, where, "shippedOn", f.get("shippedOn"))
        check_date(problems, where, "verifiedOn", f.get("verifiedOn"))
        if len(f.get("forChips") or []) != 3:
            problems.add(where, "forChips must have exactly 3 items")
        if len(f.get("bullets") or []) != 3:
            problems.add(where, "bullets must have exactly 3 items")
        check_image(problems, where, f.get("image"))

    # Changelog --------------------------------------------------------
    if len(changelog) < 4:
        problems.add("changelog", f"expected at least 4 items, found {len(changelog)}")
    for i, item in enumerate(changelog):
        where = f"changelog[{i}]"
        require_fields(problems, where, item, ["date", "text", "url"])
        check_date(problems, where, "date", item.get("date"))
        check_url(problems, where, item.get("url"))

    # scoreWeights -------------------------------------------------------
    for cid in score_weights:
        if cid not in capability_ids:
            problems.add("scoreWeights", f"references unknown capability {cid!r}")

    # No em or en dashes anywhere in the file ---------------------------
    walk_dashes(problems, "catalogue", cat)

    return problems


def validate_sources(data: object) -> Problems:
    """Checks pipeline/sources.yaml: unique ids, known parser names and kinds, and a
    URL on an allowed official host for every source."""
    problems = Problems()
    sources = data.get("sources") if isinstance(data, dict) else None
    if not isinstance(sources, list) or not sources:
        problems.add("sources", "expected a non-empty list under 'sources'")
        return problems
    seen: set[str] = set()
    for i, src in enumerate(sources):
        if not isinstance(src, dict):
            problems.add(f"sources[{i}]", "must be a mapping")
            continue
        sid = src.get("id")
        where = f"sources[{sid or i}]"
        if not isinstance(sid, str) or not re.match(r"^[a-z0-9][a-z0-9-]*$", sid):
            problems.add(where, f"id must be lowercase letters, digits and hyphens, got {sid!r}")
        elif sid in seen:
            problems.add(where, f"duplicate id {sid!r}")
        else:
            seen.add(sid)
        url = src.get("url")
        if not isinstance(url, str) or not url.startswith("https://"):
            problems.add(where, f"url must be an https URL, got {url!r}")
        elif not is_allowed_host(url):
            problems.add(where, f"url host not allowed: {url!r}")
        if src.get("parser") not in PARSER_NAMES:
            problems.add(where, f"unknown parser {src.get('parser')!r}, expected one of {sorted(PARSER_NAMES)}")
        if src.get("kind") not in SOURCE_KINDS:
            problems.add(where, f"kind must be one of {list(SOURCE_KINDS)}, got {src.get('kind')!r}")
    return problems


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("path", help="path to catalogue.yaml")
    parser.add_argument("--require", default="", help="comma separated fields required on every node")
    args = parser.parse_args()

    with open(args.path, "r", encoding="utf-8") as f:
        cat = yaml.safe_load(f)

    require = [f.strip() for f in args.require.split(",") if f.strip()]
    problems = validate(cat, require)

    # The weekly update source list sits beside the catalogue and is validated with it.
    sources_path = Path(args.path).resolve().parent / "sources.yaml"
    if sources_path.is_file():
        with open(sources_path, "r", encoding="utf-8") as f:
            problems.items.extend(validate_sources(yaml.safe_load(f)).items)

    if problems:
        print(f"catalogue-validate: {len(problems.items)} problem(s) found in {args.path}\n")
        for p in problems.items:
            print(f"  - {p}")
        return 1

    counts = {
        "surfaces": len(cat.get("surfaces") or []),
        "capabilities": len(cat.get("capabilities") or []),
        "connectors": len(cat.get("connectors") or []),
        "skills": len(cat.get("skills") or []),
        "plans": len(cat.get("plans") or []),
        "usecases": len(cat.get("usecases") or []),
        "features": len(cat.get("features") or []),
        "changelog": len(cat.get("changelog") or []),
    }
    if sources_path.is_file():
        counts["sources"] = len(yaml.safe_load(sources_path.read_text(encoding="utf-8"))["sources"])
    print(f"catalogue-validate: clean. {counts}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
