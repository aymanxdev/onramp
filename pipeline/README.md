# Onramp pipeline

1. Edit `pipeline/catalogue.yaml` by hand. Every entry needs an `officialUrl` on an allowed host and an `asOf` date.
2. Run `python3 pipeline/validate.py --require officialUrl,asOf pipeline/catalogue.yaml`. Fix every problem it prints.
3. Run `python3 pipeline/build.py`. This writes `app/public/data/catalogue.json`, `app/public/data/graph.json`, `app/public/data/changelog.json`, `app/public/feed.xml`, `app/public/feed.json` and `app/public/radar.ics`.
4. Run `python3 pipeline/golden_check.py` to check the intent keywords against the golden query list.
5. Commit `pipeline/catalogue.yaml` and the generated files under `app/public`.

`pipeline/build_graph.sh` runs steps 1 to 3 end to end, plus an optional Graphify pass over a fetched corpus first. `pipeline/fetch_corpus.py` and Graphify itself both need network access and are not part of the steps above.

`pipeline/drift.py` is the weekly drift check behind `.github/workflows/catalogue-drift.yml`: it fetches the Claude release notes page, diffs it against `pipeline/snapshots/release-notes.md`, and writes a report for the CI job to turn into an issue. After updating the catalogue for anything it flags, refresh the snapshot with `python3 pipeline/drift.py --source <url> --snapshot pipeline/snapshots/release-notes.md --update` and commit it.

## Feature images

A feature in `catalogue.yaml` may carry an optional `image: { src, alt, credit }` shown in its radar story instead of the mascot. `src` must start with `/radar/img/` and the file must exist under `app/public/radar/img/`; `alt` is required and under 140 characters. `validate.py` checks all of this.

Images must be the owner's own artwork or work licensed for redistribution. Never use a screenshot of a third-party product, and never use a logo (Claude's, Anthropic's, or anyone else's).
