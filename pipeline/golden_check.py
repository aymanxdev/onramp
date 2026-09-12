#!/usr/bin/env python3
"""A naive proxy for the real minisearch matcher in app/src/lib/matcher.

Loads app/public/data/catalogue.json, does a keyword overlap between each
golden query in BUILD_CONTRACT.md section 4.3 and every usecase's
title + tags + intent (boosted in that order, same as the real matcher's
field order), takes the top 3 usecases, sums their route weights per
surface, and prints any query whose winning surface differs from the
expected one.

This does not replace app/src/lib/matcher/golden.ts and its Vitest suite;
it exists so package B can make the intent keyword lists rich enough that
the real matcher will pass before package C's tests even run.

Usage:
    python3 pipeline/golden_check.py [path/to/catalogue.json]
"""
from __future__ import annotations

import json
import math
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_CATALOGUE = REPO_ROOT / "app" / "public" / "data" / "catalogue.json"

TITLE_WEIGHT = 3
TAGS_WEIGHT = 2
INTENT_WEIGHT = 1

TOKEN_RE = re.compile(r"[a-z0-9]+")

# Common words carry no discriminative signal for a keyword overlap proxy
# and would otherwise make almost every usecase match almost every query.
# The real matcher is a proper TF-IDF style index (minisearch) which down
# weights these on its own; this naive proxy has to do it by hand.
STOPWORDS = {
    "a", "an", "the", "my", "your", "our", "their", "his", "her", "its",
    "this", "that", "these", "those", "is", "are", "be", "been", "being",
    "to", "of", "in", "on", "for", "and", "or", "from", "with", "without",
    "it", "i", "me", "you", "we", "us", "do", "does", "did", "done",
    "has", "have", "had", "will", "would", "can", "could", "should",
    "at", "by", "as", "if", "so", "up", "out", "into", "about", "over",
    "than", "then", "when", "what", "who", "how", "before", "after",
    "not", "no", "yes", "am", "was", "were", "just", "one", "every",
    "each", "some", "any", "all", "own", "me", "him", "them",
}

# Copied verbatim from docs/BUILD_CONTRACT.md section 4.3.
GOLDEN = [
    ("automate my inbox", "cowork"),
    ("tidy my inbox every morning", "cowork"),
    ("tell me what emails need a reply today", "cowork"),
    ("prep me for tomorrow's meetings", "cowork"),
    ("write my weekly status update from my calendar", "cowork"),
    ("sort my receipts into a spreadsheet", "cowork"),
    ("organise the files on my desktop", "cowork"),
    ("watch my competitors' pricing pages every week", "cowork"),
    ("summarise a folder of pdfs", "cowork"),
    ("triage customer support emails", "cowork"),
    ("turn this blog post into linkedin posts", "chat"),
    ("write a campaign brief for our new product", "chat"),
    ("rewrite this in our brand voice", "chat"),
    ("draft our monthly newsletter", "chat"),
    ("research the market and write me a report", "chat"),
    ("turn these interview transcripts into themes", "chat"),
    ("make me a study plan and quiz me", "chat"),
    ("give me feedback on my essay", "chat"),
    ("turn my lecture slides into notes", "chat"),
    ("write a monthly investor update", "chat"),
    ("write copy for my landing page", "chat"),
    ("plan a month of instagram posts", "chat"),
    ("write a job advert for a barista", "chat"),
    ("write brand guidelines from our logo and colours", "chat"),
    ("analyse this csv and chart it", "chat"),
    ("fix a bug in my repo", "code"),
    ("review my pull request", "code"),
    ("refactor this module without breaking the tests", "code"),
    ("add tests to my untested codebase", "code"),
    ("set up github actions for my project", "code"),
    ("explain this codebase to me", "code"),
    ("prototype a checkout screen", "design"),
    ("build a landing page prototype", "design"),
    ("keep our design system in sync with the code", "design"),
    ("turn my figma file into a deck", "design"),
    ("check this spreadsheet for broken formulas", "excel"),
    ("build a financial model for my startup", "excel"),
    ("clean up this messy data", "excel"),
    ("build a monthly kpi dashboard", "excel"),
    ("make a price list spreadsheet", "excel"),
    ("audit a 40mb spreadsheet", "excel"),
    ("turn my notes into a pitch deck", "powerpoint"),
    ("make slides from this spreadsheet", "powerpoint"),
    ("turn my messy research notes into a client deck", "powerpoint"),
    ("edit my manuscript for tone", "word"),
    ("tidy up this long word document", "word"),
    ("summarise my slack channel", "slack"),
    ("daily digest of our team slack", "slack"),
    ("summarise the article I am reading", "chrome"),
    ("summarise this contract before I sign", "chrome"),
    ("fill in this long web form from my notes", "chrome"),
    ("read the page I have open and answer questions", "chrome"),
    ("chase unpaid invoices", "outlook"),
    ("send polite reminders about late payments", "outlook"),
    ("build claude into my own app", "api"),
    ("call the api from my backend", "api"),
    ("start a long job from my phone", "mobile"),
    ("send claude a task from my phone and pick it up later", "mobile"),
    ("draft replies to supplier emails in my tone", "cowork"),
    ("keep me posted on changes to a website", "cowork"),
    ("summarise my team's slack threads every friday", "slack"),
]


def tokenise(text: str) -> set[str]:
    return {tok for tok in TOKEN_RE.findall(text.lower()) if tok not in STOPWORDS}


def usecase_field_weights(usecase: dict) -> dict[str, int]:
    """Maps each token appearing in title / tags / intent to the highest
    boost weight it appears under, mirroring the real matcher's field
    order (title, tags, intent)."""
    weights: dict[str, int] = {}

    def add(text: str, weight: int) -> None:
        for tok in tokenise(text):
            if weights.get(tok, 0) < weight:
                weights[tok] = weight

    add(usecase["title"], TITLE_WEIGHT)
    for tag in usecase.get("tags") or []:
        add(tag, TAGS_WEIGHT)
    for kw in usecase.get("intent") or []:
        add(kw, INTENT_WEIGHT)
    return weights


def build_idf(usecases: list[dict]) -> dict[str, float]:
    """A rough document-frequency down weighting, the way a real search
    index (minisearch included) scores a common word like "notes" or
    "build" lower than a distinctive one like "manuscript" or "kpi". A flat
    keyword count would let two or three weakly-matching usecases on the
    wrong surface outvote the one clearly right usecase, which a proper
    TF-IDF style index does not do."""
    n = len(usecases)
    df: dict[str, int] = {}
    for u in usecases:
        tokens: set[str] = set()
        for field in ("title",):
            tokens |= tokenise(u[field])
        for tag in u.get("tags") or []:
            tokens |= tokenise(tag)
        for kw in u.get("intent") or []:
            tokens |= tokenise(kw)
        for tok in tokens:
            df[tok] = df.get(tok, 0) + 1
    return {tok: math.log((n + 1) / (count + 1)) + 1 for tok, count in df.items()}


def score(query_tokens: set[str], weights: dict[str, int], idf: dict[str, float]) -> float:
    return sum(weights.get(tok, 0) * idf.get(tok, 1.0) for tok in query_tokens)


def winning_surface(query: str, usecases: list[dict], idf: dict[str, float]
                     ) -> tuple[str | None, list[tuple[str, float]]]:
    query_tokens = tokenise(query)
    scored = []
    for u in usecases:
        weights = usecase_field_weights(u)
        s = score(query_tokens, weights, idf)
        if s > 0:
            scored.append((s, u))
    scored.sort(key=lambda pair: pair[0], reverse=True)
    top3 = scored[:3]
    top_score = top3[0][0] if top3 else 0.0

    # A usecase's vote for its surface is scaled by how strong its own match
    # was relative to the best match in the top 3, squared. A real ranked
    # search index (and a person reading the results) would not let a
    # usecase that barely scraped into third place outvote a usecase that
    # matched the query far more strongly; a flat, unscaled sum of route
    # weights would.
    surface_weight: dict[str, float] = {}
    for s, u in top3:
        relevance = (s / top_score) ** 2 if top_score else 0.0
        for route in u.get("routes") or []:
            surface_weight[route["surface"]] = (
                surface_weight.get(route["surface"], 0.0) + route["weight"] * relevance
            )

    if not surface_weight:
        return None, []
    ranked = sorted(surface_weight.items(), key=lambda pair: pair[1], reverse=True)
    return ranked[0][0], ranked


def main() -> int:
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_CATALOGUE
    with open(path, "r", encoding="utf-8") as f:
        catalogue = json.load(f)
    usecases = catalogue.get("usecases") or []

    idf = build_idf(usecases)

    misses = []
    for query, expected in GOLDEN:
        winner, ranked = winning_surface(query, usecases, idf)
        if winner != expected:
            misses.append((query, expected, winner, ranked))

    print(f"golden_check: {len(GOLDEN)} quer(ies), {len(misses)} miss(es)")
    for query, expected, winner, ranked in misses:
        print(f"  MISS: {query!r}")
        print(f"        expected {expected!r}, got {winner!r}")
        print(f"        ranked: {ranked}")

    return 1 if misses else 0


if __name__ == "__main__":
    sys.exit(main())
