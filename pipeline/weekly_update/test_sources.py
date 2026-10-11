"""Parser, fetch-error and sources.yaml tests. No network: fixtures only.
Run with: python -m unittest discover pipeline/weekly_update"""
import importlib.util
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from weekly_update import sources as S  # noqa: E402
from weekly_update.htmltree import parse_html  # noqa: E402

FIXTURES = HERE / "fixtures"
PIPELINE = HERE.parent


def fixture(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


class ParseDateTests(unittest.TestCase):
    def test_formats_seen_on_the_sources(self):
        self.assertEqual(S.parse_date("October 7, 2026"), "2026-10-07")
        self.assertEqual(S.parse_date("Oct 06, 2026"), "2026-10-06")
        self.assertEqual(S.parse_date("Sep 1, 2026"), "2026-09-01")
        self.assertEqual(S.parse_date("2026-10-08"), "2026-10-08")

    def test_rejects_non_dates(self):
        self.assertIsNone(S.parse_date("Featured"))
        self.assertIsNone(S.parse_date("Smarch 40, 2026"))
        self.assertIsNone(S.parse_date("February 30, 2026"))


class ReleaseNotesTests(unittest.TestCase):
    def setUp(self):
        self.items = S.parse_support_release_notes(
            fixture("release-notes.html"), "https://support.claude.com/en/articles/12138966-release-notes"
        )

    def test_splits_several_items_per_date(self):
        titles = [(i["date"], i["title"]) for i in self.items]
        self.assertIn(("2026-10-07", "Claude Haiku 5.5 launch"), titles)
        self.assertIn(("2026-10-07", "Monthly API credits for Max and Team plans"), titles)
        self.assertIn(("2026-09-25", "Build plugins for Claude"), titles)

    def test_key_is_date_and_normalised_title_and_url_is_an_anchor(self):
        first = self.items[0]
        self.assertEqual(first["key"], "2026-10-07|claude-haiku-5-5-launch")
        self.assertTrue(first["url"].startswith("https://support.claude.com/en/articles/12138966-release-notes#h_"))

    def test_text_is_the_body_not_the_heading(self):
        self.assertIn("Claude Haiku 5.5", self.items[0]["text"])
        self.assertNotEqual(self.items[0]["text"], self.items[0]["title"])

    def test_keys_are_unique(self):
        keys = [i["key"] for i in self.items]
        self.assertEqual(len(keys), len(set(keys)))

    def test_no_article_is_a_parse_error(self):
        with self.assertRaises(S.ParseError):
            S.parse_support_release_notes("<html><body><p>hi</p></body></html>", "https://x")


class ClaudeDevTests(unittest.TestCase):
    def setUp(self):
        self.items = S.parse_claude_dev(fixture("claude-dev.html"), "https://claude.dev")

    def test_key_and_url_are_the_post_link(self):
        first = self.items[0]
        self.assertEqual(first["url"], "https://claude.dev/blog/building-effective-agent-automations/")
        self.assertEqual(first["key"], first["url"])

    def test_featured_post_date_comes_from_the_page_data(self):
        self.assertEqual(self.items[0]["date"], "2026-10-08")

    def test_listed_posts_use_their_card_date(self):
        by_title = {i["title"]: i["date"] for i in self.items}
        self.assertEqual(by_title["Getting started with Claude Code mods"], "2026-10-01")

    def test_no_posts_is_a_parse_error(self):
        with self.assertRaises(S.ParseError):
            S.parse_claude_dev("<html><body></body></html>", "https://claude.dev")


class AnthropicNewsTests(unittest.TestCase):
    def setUp(self):
        self.items = S.parse_anthropic_news(fixture("anthropic-news.html"), "https://www.anthropic.com/news")

    def test_featured_side_and_list_items_are_all_found(self):
        titles = [i["title"] for i in self.items]
        self.assertIn("Expanding the Cyber Verification Program", titles)
        self.assertIn("Introducing Claude Haiku 5.5", titles)
        self.assertIn("2026 Usage Policy update", titles)
        self.assertEqual(len(self.items), 7)

    def test_links_are_absolute_and_dated(self):
        haiku = next(i for i in self.items if "Haiku" in i["title"])
        self.assertEqual(haiku["url"], "https://www.anthropic.com/claude-haiku-5-5")
        self.assertEqual(haiku["date"], "2026-10-07")
        self.assertIn("small model", haiku["text"])

    def test_no_news_is_a_parse_error(self):
        with self.assertRaises(S.ParseError):
            S.parse_anthropic_news("<html></html>", "https://www.anthropic.com/news")


class ChangelogTests(unittest.TestCase):
    def setUp(self):
        self.items = S.parse_claude_code_changelog(
            fixture("claude-code-changelog.html"), "https://code.claude.com/docs/en/changelog"
        )

    def test_one_item_per_version_with_date(self):
        self.assertEqual([i["title"] for i in self.items], ["Claude Code 2.1.296", "Claude Code 2.1.295"])
        self.assertEqual([i["date"] for i in self.items], ["2026-10-09", "2026-10-08"])
        self.assertEqual(self.items[0]["key"], "https://code.claude.com/docs/en/changelog#2-1-296")

    def test_bullets_become_text_without_maths_markup(self):
        text = self.items[0]["text"]
        self.assertTrue(text.startswith("- Added a code key"))
        self.assertNotIn("annotation", text)
        self.assertNotIn("application/x-tex", text)


class FetchSourceTests(unittest.TestCase):
    src = S.Source(id="x", name="X", url="https://claude.dev", parser="claude-dev", kind="blog")

    def test_fetch_failure_is_reported_not_raised(self):
        def boom(url):
            raise S.FetchError("HTTP 503")

        items, error = S.fetch_source(self.src, boom)
        self.assertEqual(items, [])
        self.assertIn("HTTP 503", error)

    def test_unexpected_exception_is_reported_not_raised(self):
        def boom(url):
            raise RuntimeError("kaboom")

        items, error = S.fetch_source(self.src, boom)
        self.assertEqual(items, [])
        self.assertIn("kaboom", error)

    def test_changed_layout_is_reported_not_raised(self):
        items, error = S.fetch_source(self.src, lambda url: "<html><body>redesigned</body></html>")
        self.assertEqual(items, [])
        self.assertIn("parse failed", error)

    def test_success_returns_items(self):
        items, error = S.fetch_source(self.src, lambda url: fixture("claude-dev.html"))
        self.assertIsNone(error)
        self.assertGreater(len(items), 1)


class HtmlTreeTests(unittest.TestCase):
    def test_text_skips_script_aria_hidden_and_keeps_block_lines(self):
        root = parse_html('<div><p>One</p><script>x()</script><span aria-hidden="true">ghost</span><p>Two <b>bold</b></p></div>')
        self.assertEqual(root.text(), "One\nTwo bold")

    def test_unmatched_end_tags_and_void_elements_do_not_break_it(self):
        root = parse_html("<div><br><img src=x></span><p>ok</p></div>")
        self.assertEqual(root.inline_text(), "ok")


class SourcesYamlTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        spec = importlib.util.spec_from_file_location("validate_mod", PIPELINE / "validate.py")
        cls.validate = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.validate)

    def good(self):
        return {"sources": [{"id": "a", "url": "https://claude.dev", "parser": "claude-dev", "kind": "blog"}]}

    def test_the_committed_sources_file_is_valid(self):
        import yaml

        data = yaml.safe_load((PIPELINE / "sources.yaml").read_text(encoding="utf-8"))
        self.assertFalse(self.validate.validate_sources(data), self.validate.validate_sources(data).items)
        self.assertEqual(len(S.load_sources(PIPELINE / "sources.yaml")), 4)

    def test_disallowed_host(self):
        data = self.good()
        data["sources"][0]["url"] = "https://example.com/feed"
        self.assertIn("host not allowed", "\n".join(self.validate.validate_sources(data).items))

    def test_look_alike_host_is_rejected(self):
        data = self.good()
        data["sources"][0]["url"] = "https://claude.dev.evil.example/x"
        self.assertTrue(self.validate.validate_sources(data))

    def test_unknown_parser(self):
        data = self.good()
        data["sources"][0]["parser"] = "nope"
        self.assertIn("unknown parser", "\n".join(self.validate.validate_sources(data).items))

    def test_duplicate_ids(self):
        data = self.good()
        data["sources"].append(dict(data["sources"][0]))
        self.assertIn("duplicate id", "\n".join(self.validate.validate_sources(data).items))

    def test_unknown_kind_and_empty_list(self):
        data = self.good()
        data["sources"][0]["kind"] = "podcast"
        self.assertTrue(self.validate.validate_sources(data))
        self.assertTrue(self.validate.validate_sources({"sources": []}))

    def test_claude_dev_is_an_allowed_catalogue_host(self):
        self.assertTrue(self.validate.is_allowed_host("https://claude.dev/blog/x/"))


if __name__ == "__main__":
    unittest.main()
