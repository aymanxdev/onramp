"""Catalogue insertion tests: existing lines stay byte for byte and the result validates."""
import importlib.util
import sys
import unittest
from pathlib import Path

import yaml

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from weekly_update import writer as W  # noqa: E402

CATALOGUE = HERE.parent / "catalogue.yaml"


def load_validator():
    spec = importlib.util.spec_from_file_location("validate_mod", HERE.parent / "validate.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def feature(fid="new-thing", **over):
    f = {
        "id": fid, "name": "New thing", "surface": ["cowork"],
        "plainWords": "Do a new thing without leaving the page.",
        "whatItIs": "A new capability in Cowork.", "whoItIsFor": "For people who want it.",
        "forChips": ["One", "Two", "Three"], "bullets": ["A.", "B.", "C."],
        "shippedOn": "2026-10-07", "verifiedOn": "2026-10-11", "plans": ["pro", "max"],
        "officialUrl": "https://support.claude.com/en/articles/12138966-release-notes#h_1",
        "tryPrompt": "Try the new thing.", "pitfalls": [], "status": "published",
        "introduces": [], "weight": 5,
    }
    f.update(over)
    return f


CHANGE = {"date": "2026-10-07", "text": "New thing arrives: with a colon",
          "url": "https://support.claude.com/en/articles/12138966-release-notes#h_1"}


class WriterTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.original = CATALOGUE.read_text(encoding="utf-8")
        cls.validator = load_validator()

    def draft(self, **over):
        return {
            "feature": feature(**over),
            "featureComments": {"_top": ["OWNER: confirm availability"], "plans": ["OWNER: confirm plans"]},
            "changelog": dict(CHANGE),
        }

    def test_existing_lines_are_untouched_and_the_result_validates(self):
        updated = W.apply_drafts(self.original, [self.draft()])
        old_lines = self.original.splitlines(keepends=True)
        new_lines = updated.splitlines(keepends=True)
        self.assertGreater(len(new_lines), len(old_lines))
        # Every original line appears, in order, with nothing changed: new lines are only inserted.
        it = iter(new_lines)
        for line in old_lines:
            for candidate in it:
                if candidate == line:
                    break
            else:
                self.fail(f"original line lost or changed: {line!r}")
        self.assertEqual(len(new_lines) - len(old_lines), len(updated.splitlines()) - len(self.original.splitlines()))
        problems = self.validator.validate(yaml.safe_load(updated), ["officialUrl", "asOf"])
        self.assertFalse(problems, problems.items)

    def test_original_prefix_and_suffix_blocks_are_identical(self):
        updated = W.apply_drafts(self.original, [self.draft()])
        feat = self.original.index("\nchangelog:\n")
        # Everything up to the end of the features list is a byte-for-byte prefix.
        self.assertTrue(updated.startswith(self.original[:feat].rstrip("\n")))
        self.assertTrue(updated.endswith(self.original[self.original.index("\nscoreWeights:"):]))

    def test_entries_land_at_the_end_of_the_right_lists(self):
        updated = W.apply_drafts(self.original, [self.draft()])
        cat = yaml.safe_load(updated)
        base = yaml.safe_load(self.original)
        self.assertEqual(cat["features"][-1]["id"], "new-thing")
        self.assertEqual(cat["features"][:-1], base["features"])
        self.assertEqual(cat["changelog"][-1], CHANGE)
        self.assertEqual(cat["changelog"][:-1], base["changelog"])
        self.assertEqual(cat["usecases"], base["usecases"])

    def test_owner_comments_are_emitted_above_their_fields(self):
        updated = W.apply_drafts(self.original, [self.draft()])
        lines = updated.splitlines()
        i = lines.index("- id: new-thing")
        self.assertEqual(lines[i - 1], "# OWNER: confirm availability")
        j = next(n for n in range(i, len(lines)) if lines[n] == "  plans:")
        self.assertEqual(lines[j - 1], "  # OWNER: confirm plans")

    def test_comments_do_not_change_the_parsed_data(self):
        with_comments = W.apply_drafts(self.original, [self.draft()])
        without = W.apply_drafts(self.original, [{**self.draft(), "featureComments": {}}])
        self.assertEqual(yaml.safe_load(with_comments), yaml.safe_load(without))

    def test_changelog_only_draft_adds_no_feature(self):
        updated = W.apply_drafts(self.original, [{"feature": None, "changelog": dict(CHANGE)}])
        base = yaml.safe_load(self.original)
        cat = yaml.safe_load(updated)
        self.assertEqual(len(cat["features"]), len(base["features"]))
        self.assertEqual(len(cat["changelog"]), len(base["changelog"]) + 1)

    def test_text_that_looks_like_yaml_is_serialised_safely(self):
        nasty = self.draft(whatItIs="key: value\n- list item # not a comment", name="Quote \" and 'apostrophe'")
        cat = yaml.safe_load(W.apply_drafts(self.original, [nasty]))
        self.assertEqual(cat["features"][-1]["whatItIs"], "key: value\n- list item # not a comment")
        self.assertEqual(cat["features"][-1]["name"], "Quote \" and 'apostrophe'")

    def test_no_drafts_returns_the_text_unchanged(self):
        self.assertEqual(W.apply_drafts(self.original, []), self.original)

    def test_a_file_without_a_trailing_newline_in_the_list_still_works(self):
        text = "features:\n- id: a\n  name: A\nchangelog:\n- date: '2026-01-01'\n  text: t\n  url: https://claude.com\n# end"
        out = W.insert_entries(text, "changelog", ["- date: '2026-02-01'\n  text: u\n  url: https://claude.com\n"])
        self.assertEqual(len(yaml.safe_load(out)["changelog"]), 2)
        self.assertTrue(out.endswith("# end"))

    def test_missing_section_is_an_error(self):
        with self.assertRaises(W.InsertError):
            W.insert_entries("a: 1\n", "features", ["- id: x\n"])


if __name__ == "__main__":
    unittest.main()
