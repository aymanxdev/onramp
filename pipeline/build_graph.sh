#!/usr/bin/env bash
# Runs the full pipeline: fetch the corpus, run Graphify if it is installed,
# validate the catalogue, then build the JSON and feed artefacts the app
# reads. Safe to run with no network and no Graphify installed; the
# Graphify step is skipped, not fatal.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "== 1. fetch corpus =="
python3 pipeline/fetch_corpus.py

echo "== 2. graphify =="
if command -v graphify >/dev/null 2>&1; then
  (cd pipeline && graphify . --output graphify-out)
else
  echo "note: graphify is not installed, skipping. pip install graphifyy to enable it."
fi

echo "== 3. validate =="
python3 pipeline/validate.py --require officialUrl,asOf pipeline/catalogue.yaml

echo "== 4. build =="
python3 pipeline/build.py

echo "== done =="
