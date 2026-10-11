# Onramp pipeline

1. Edit `pipeline/catalogue.yaml` by hand. Every entry needs an `officialUrl` on an allowed host and an `asOf` date.
2. Run `python3 pipeline/validate.py --require officialUrl,asOf pipeline/catalogue.yaml`. Fix every problem it prints.
3. Run `python3 pipeline/build.py`. This writes `app/public/data/catalogue.json`, `app/public/data/graph.json`, `app/public/data/changelog.json`, `app/public/feed.xml`, `app/public/feed.json` and `app/public/radar.ics`.
4. Run `python3 pipeline/golden_check.py` to check the intent keywords against the golden query list.
5. Commit `pipeline/catalogue.yaml` and the generated files under `app/public`.

`pipeline/build_graph.sh` runs steps 1 to 3 end to end, plus an optional Graphify pass over a fetched corpus first. `pipeline/fetch_corpus.py` and Graphify itself both need network access and are not part of the steps above.


## Weekly update

`pipeline/sources.yaml` lists the official pages the weekly update job reads. `validate.py` checks that every URL is on an allowed host and every parser name is known. The job code lives in `pipeline/weekly_update/` (standard library plus PyYAML):

```
pnpm --dir app weekly:draft:build        # bundles scripts/weekly-update/draft.ts to scripts/weekly-update/dist/draft.mjs
python -m pipeline.weekly_update run --out /tmp/weekly --dry-run              # preview on temporary copies
python -m pipeline.weekly_update run --out /tmp/weekly --seed                 # record current items, propose nothing
python -m unittest discover pipeline/weekly_update                            # offline tests
```

Per-source snapshots live in `pipeline/snapshots/<source-id>.json`. Without `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_AI_TOKEN` every item gets a plain stub.

## Feature images

A feature in `catalogue.yaml` may carry an optional `image: { src, alt, credit }` shown in its radar story instead of the mascot. `src` must start with `/radar/img/` and the file must exist under `app/public/radar/img/`; `alt` is required and under 140 characters. `validate.py` checks all of this.

Images must be the owner's own artwork or work licensed for redistribution. Never use a screenshot of a third-party product, and never use a logo (Claude's, Anthropic's, or anyone else's).
