"""Snapshot, diff, seed, aggregation and source-health tests. No network."""
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from weekly_update import sources as S  # noqa: E402
from weekly_update import state as T  # noqa: E402


def item(key, title="T", date="2026-10-01"):
    return {"key": key, "title": title, "date": date, "url": f"https://claude.dev/{key}", "text": title}


class SnapshotTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self.tmp.name)
        self.addCleanup(self.tmp.cleanup)

    def test_no_snapshot_means_nothing_is_new(self):
        self.assertIsNone(T.load_snapshot(self.dir, "a"))
        self.assertEqual(T.new_items(None, [item("1"), item("2")]), [])

    def test_seed_then_diff_finds_only_new_keys(self):
        T.write_snapshot(self.dir, "a", T.merge_snapshot(None, [item("1"), item("2")]))
        snap = T.load_snapshot(self.dir, "a")
        fresh = T.new_items(snap, [item("1"), item("2"), item("3")])
        self.assertEqual([i["key"] for i in fresh], ["3"])

    def test_merge_keeps_old_keys_and_is_deterministic(self):
        first = T.merge_snapshot(None, [item("b", date="2026-09-01"), item("a", date="2026-10-01")])
        T.write_snapshot(self.dir, "a", first)
        again = T.merge_snapshot(T.load_snapshot(self.dir, "a"), [item("c", date="2026-10-05")])
        self.assertEqual([e["key"] for e in again], ["c", "a", "b"])
        self.assertEqual(T.merge_snapshot(T.load_snapshot(self.dir, "a"), [item("a", date="2026-10-01")]), first)

    def test_snapshot_file_is_plain_json(self):
        path = T.write_snapshot(self.dir, "a", T.merge_snapshot(None, [item("1")]))
        data = json.loads(path.read_text(encoding="utf-8"))
        self.assertEqual(data["source"], "a")
        self.assertEqual(data["items"][0]["key"], "1")

    def test_corrupt_snapshot_raises_a_clear_error(self):
        (self.dir / "a.json").write_text("{nope", encoding="utf-8")
        with self.assertRaises(ValueError):
            T.load_snapshot(self.dir, "a")


class AggregateTests(unittest.TestCase):
    src = S.Source(id="cc", name="Claude Code changelog", url="https://code.claude.com/docs/en/changelog",
                   parser="claude-code-changelog", kind="changelog")

    def test_many_new_versions_become_one_item(self):
        fresh = [item("v3", "Claude Code 2.1.3", "2026-10-09"), item("v2", "Claude Code 2.1.2", "2026-10-08"),
                 item("v1", "Claude Code 2.1.1", "2026-10-07")]
        out = T.aggregate_changelog(self.src, fresh)
        self.assertEqual(len(out), 1)
        self.assertEqual(out[0]["title"], "Claude Code 2.1.1 to 2.1.3")
        self.assertEqual(out[0]["date"], "2026-10-09")
        self.assertEqual(out[0]["key"], "v3")
        self.assertEqual(out[0]["count"], 3)

    def test_one_version_is_left_alone_and_none_is_empty(self):
        one = [item("v1", "Claude Code 2.1.1")]
        self.assertEqual(T.aggregate_changelog(self.src, one), one)
        self.assertEqual(T.aggregate_changelog(self.src, []), [])


class HealthTests(unittest.TestCase):
    def test_failures_count_up_and_issue_opens_at_two(self):
        h = {"sources": {}}
        r1 = T.update_health(h, {"a": "boom", "b": None})
        self.assertEqual(r1["needsIssue"], [])
        self.assertEqual(r1["health"]["sources"]["a"]["consecutiveFailures"], 1)
        r2 = T.update_health(r1["health"], {"a": "boom", "b": None})
        self.assertEqual(r2["needsIssue"], ["a"])
        r3 = T.update_health(r2["health"], {"a": "boom", "b": None})
        self.assertEqual(r3["health"]["sources"]["a"]["consecutiveFailures"], 3)
        self.assertEqual(r3["needsIssue"], ["a"])

    def test_recovery_resets_and_is_reported_once(self):
        h = {"sources": {"a": {"consecutiveFailures": 2}}}
        r = T.update_health(h, {"a": None})
        self.assertEqual(r["recovered"], ["a"])
        self.assertEqual(r["health"]["sources"]["a"]["consecutiveFailures"], 0)
        self.assertEqual(T.update_health(r["health"], {"a": None})["recovered"], [])

    def test_missing_or_corrupt_file_starts_empty(self):
        with tempfile.TemporaryDirectory() as d:
            self.assertEqual(T.load_health(Path(d) / "none.json"), {"sources": {}})
            bad = Path(d) / "bad.json"
            bad.write_text("not json", encoding="utf-8")
            self.assertEqual(T.load_health(bad), {"sources": {}})
            self.assertEqual(T.load_health(None), {"sources": {}})

    def test_save_and_load_round_trip(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "sub" / "source-health.json"
            T.save_health(path, {"sources": {"a": {"consecutiveFailures": 1}}})
            self.assertEqual(T.load_health(path)["sources"]["a"]["consecutiveFailures"], 1)


if __name__ == "__main__":
    unittest.main()
