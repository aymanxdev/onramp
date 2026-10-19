"""End-to-end tests of `python -m pipeline.weekly_update run` with a fake fetcher and a fake
draft step, so nothing touches the network or needs Node."""
import contextlib
import hashlib
import io
import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import yaml

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from weekly_update import cli, state  # noqa: E402
from weekly_update import sources as S  # noqa: E402

FIXTURES = HERE / "fixtures"
PAGES = {
    "https://support.claude.com/en/articles/12138966-release-notes": "release-notes.html",
    "https://claude.dev": "claude-dev.html",
    "https://www.anthropic.com/news": "anthropic-news.html",
    "https://code.claude.com/docs/en/changelog": "claude-code-changelog.html",
}


def fake_fetch(url):
    return (FIXTURES / PAGES[url]).read_text(encoding="utf-8")


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def fake_draft(items_path, known_path, out_path, date, bundle, node, stubs_only):
    """Stands in for scripts/weekly-update/draft.ts: a stub feature per release note, a changelog
    line only for every other kind, matching the real `draftItems` allow list."""
    items = json.loads(Path(items_path).read_text(encoding="utf-8"))
    drafts = []
    for n, it in enumerate(items):
        feature = None
        if it["kind"] != "release-notes":
            mode, reason = "changelog-only", f"{it['kind']} source"
        else:
            mode, reason = "stub", "no AI credentials"
            feature = {
                "id": f"fake-{n}", "name": it["title"][:60], "surface": ["cowork"], "plainWords": "Plain words here.",
                "whatItIs": "What it is.", "whoItIsFor": "For people who test.", "forChips": ["A", "B", "C"],
                "bullets": ["One.", "Two.", "Three."], "shippedOn": it["date"], "verifiedOn": date,
                "plans": ["pro"], "officialUrl": it["url"], "tryPrompt": "Try it.", "pitfalls": [],
                "status": "draft", "introduces": [], "weight": 5,
            }
        drafts.append({
            "key": it["key"], "sourceId": it["sourceId"], "title": it["title"], "url": it["url"], "date": it["date"],
            "mode": mode, "reason": reason, "productChange": None, "feature": feature,
            "featureComments": {"_top": ["OWNER: confirm availability"]} if feature else {},
            "changelog": {"date": it["date"], "text": it["title"][:100], "url": it["url"]}, "changelogComments": {},
        })
    result = {"date": date, "cap": 20, "modelCalls": 0, "stubsOnly": True, "drafts": drafts}
    Path(out_path).write_text(json.dumps(result), encoding="utf-8")
    return result


class CliTests(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.tmp, True)
        self.cat = self.tmp / "catalogue.yaml"
        shutil.copy(HERE.parent / "catalogue.yaml", self.cat)
        self.snaps = self.tmp / "snapshots"
        self.out = self.tmp / "out"
        self.health = self.tmp / "health" / "source-health.json"

    def run_cli(self, *extra, fetcher=fake_fetch, draft=fake_draft):
        argv = ["run", "--out", str(self.out), "--catalogue", str(self.cat), "--snapshots", str(self.snaps),
                "--date", "2026-10-19", *extra]
        buf = io.StringIO()
        with mock.patch.object(cli, "run_draft", draft), contextlib.redirect_stdout(buf):
            code = cli.main(argv, fetcher=fetcher)
        summary = json.loads((self.out / "summary.json").read_text(encoding="utf-8"))
        return code, summary, buf.getvalue()

    def seed(self):
        return self.run_cli("--seed")

    def drop_keys(self, source_id, count):
        snap = json.loads((self.snaps / f"{source_id}.json").read_text(encoding="utf-8"))
        snap["items"] = snap["items"][count:]
        (self.snaps / f"{source_id}.json").write_text(json.dumps(snap), encoding="utf-8")

    def test_seed_records_every_source_and_proposes_nothing(self):
        before = digest(self.cat)
        code, summary, _ = self.seed()
        self.assertEqual(code, 0)
        self.assertTrue(summary["seeded"])
        self.assertEqual(summary["newItems"], 0)
        self.assertEqual(sorted(p.name for p in self.snaps.iterdir()),
                         ["anthropic-news.json", "claude-code-changelog.json", "claude-dev.json", "support-release-notes.json"])
        self.assertEqual(digest(self.cat), before)
        self.assertIn("seed", (self.out / "pr-title.txt").read_text())

    def test_nothing_new_after_a_seed(self):
        self.seed()
        code, summary, text = self.run_cli()
        self.assertEqual(code, 0)
        self.assertEqual(summary["newItems"], 0)
        self.assertFalse(summary["changed"])
        self.assertFalse((self.out / "pr-body.md").exists())
        self.assertIn("nothing new", text)

    def test_new_items_are_drafted_written_and_reported(self):
        self.seed()
        self.drop_keys("support-release-notes", 2)   # the 2 newest release notes look new
        self.drop_keys("claude-code-changelog", 1)   # 1 new Claude Code version
        self.drop_keys("claude-dev", 1)
        code, summary, _ = self.run_cli()
        self.assertEqual(code, 0)
        self.assertEqual(summary["newItems"], 4)
        self.assertEqual(summary["title"], "[Weekly update] 2026-10-19: 4 new items")
        self.assertEqual((self.out / "pr-title.txt").read_text().strip(), summary["title"])
        body = (self.out / "pr-body.md").read_text()
        self.assertIn("Haiku 5.5 launch", body)
        self.assertIn("Facts to confirm", body)
        cat = yaml.safe_load(self.cat.read_text(encoding="utf-8"))
        base = yaml.safe_load((HERE.parent / "catalogue.yaml").read_text(encoding="utf-8"))
        self.assertEqual(len(cat["features"]), len(base["features"]) + 2)
        self.assertEqual(len(cat["changelog"]), len(base["changelog"]) + 4)
        # Merging advances the snapshots: the same run again proposes nothing.
        _, again, _ = self.run_cli()
        self.assertEqual(again["newItems"], 0)

    def test_changelog_source_is_one_aggregated_item(self):
        self.seed()
        self.drop_keys("claude-code-changelog", 0)
        data = json.loads((self.snaps / "claude-code-changelog.json").read_text())
        data["items"] = []
        (self.snaps / "claude-code-changelog.json").write_text(json.dumps(data))
        _, summary, _ = self.run_cli()
        self.assertEqual(summary["newItems"], 1)
        self.assertEqual(summary["sources"]["claude-code-changelog"]["new"], 2)
        items = json.loads((self.out / "new-items.json").read_text())
        self.assertTrue(items[0]["aggregate"])
        self.assertEqual(items[0]["title"], "Claude Code 2.1.295 to 2.1.296")

    def test_news_items_are_flagged_for_review_in_the_pull_request(self):
        self.seed()
        self.drop_keys("anthropic-news", 1)
        _, summary, _ = self.run_cli()
        self.assertEqual(summary["newItems"], 1)
        body = (self.out / "pr-body.md").read_text()
        self.assertIn("news changelog line: delete it if it is not about Claude", body)

    def test_blog_items_are_changelog_only_in_the_pull_request(self):
        self.seed()
        self.drop_keys("claude-dev", 1)
        _, summary, _ = self.run_cli()
        self.assertEqual(summary["newItems"], 1)
        body = (self.out / "pr-body.md").read_text()
        self.assertIn("changelog only (blog)", body)

    def test_title_uses_the_singular_for_one_item(self):
        self.seed()
        self.drop_keys("claude-dev", 1)
        _, summary, _ = self.run_cli()
        self.assertEqual(summary["title"], "[Weekly update] 2026-10-19: 1 new item")

    def test_dry_run_changes_no_tracked_file(self):
        self.seed()
        self.drop_keys("support-release-notes", 1)
        before = {p: digest(p) for p in [self.cat, *self.snaps.iterdir()]}
        code, summary, _ = self.run_cli("--dry-run", "--health", str(self.health))
        self.assertEqual(code, 0)
        self.assertEqual(summary["newItems"], 1)
        self.assertEqual({p: digest(p) for p in before}, before)
        self.assertFalse(self.health.exists())
        copy = yaml.safe_load((self.out / "dry-run" / "catalogue.yaml").read_text(encoding="utf-8"))
        original = yaml.safe_load(self.cat.read_text(encoding="utf-8"))
        self.assertEqual(len(copy["changelog"]), len(original["changelog"]) + 1)

    def test_a_failed_source_is_collected_not_raised_and_counted(self):
        def flaky(url):
            if "claude.dev" in url:
                raise S.FetchError("HTTP 503")
            return fake_fetch(url)

        code, summary, _ = self.run_cli("--seed", "--health", str(self.health), fetcher=flaky)
        self.assertEqual(code, 0)
        self.assertEqual(summary["failedSources"], ["claude-dev"])
        self.assertEqual(summary["sourceProblemIssue"], [])
        self.assertFalse((self.snaps / "claude-dev.json").exists())
        self.assertIn("claude-dev", (self.out / "pr-body.md").read_text())
        # A second consecutive failure asks for the single issue.
        _, second, _ = self.run_cli("--seed", "--health", str(self.health), fetcher=flaky)
        self.assertEqual(second["sourceProblemIssue"], ["claude-dev"])
        # Recovery is reported so the workflow can close the issue.
        _, third, _ = self.run_cli("--seed", "--health", str(self.health))
        self.assertEqual(third["recoveredSources"], ["claude-dev"])
        self.assertEqual(state.load_health(self.health)["sources"]["claude-dev"]["consecutiveFailures"], 0)

    def test_a_source_with_no_snapshot_is_seeded_not_proposed(self):
        self.seed()
        (self.snaps / "claude-dev.json").unlink()
        _, summary, _ = self.run_cli()
        self.assertEqual(summary["newItems"], 0)
        self.assertEqual(summary["newlySeededSources"], ["claude-dev"])
        self.assertTrue((self.snaps / "claude-dev.json").exists())

    def test_invalid_drafts_fall_back_to_stubs(self):
        self.seed()
        self.drop_keys("support-release-notes", 1)
        calls = []

        def draft(items_path, known_path, out_path, date, bundle, node, stubs_only):
            calls.append(stubs_only)
            result = fake_draft(items_path, known_path, out_path, date, bundle, node, stubs_only)
            if not stubs_only:
                result["drafts"][0]["feature"]["status"] = "bogus"  # fails validation
            return result

        _, summary, _ = self.run_cli(draft=draft)
        self.assertEqual(calls, [False, True])
        self.assertTrue(summary["validationFellBackToStubs"])
        self.assertIn("Validation fell back to stubs", (self.out / "pr-body.md").read_text())
        yaml.safe_load(self.cat.read_text(encoding="utf-8"))

    def test_a_missing_draft_bundle_is_a_clear_crash(self):
        self.seed()
        self.drop_keys("claude-dev", 1)
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf), contextlib.redirect_stderr(io.StringIO()) as err:
            code = cli.main(["run", "--out", str(self.out), "--catalogue", str(self.cat), "--snapshots", str(self.snaps),
                             "--draft-bundle", str(self.tmp / "missing.mjs")], fetcher=fake_fetch)
        self.assertEqual(code, 1)
        self.assertIn("draft bundle missing", err.getvalue())


if __name__ == "__main__":
    unittest.main()
