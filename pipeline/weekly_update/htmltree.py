"""A very small DOM built on the standard library HTML parser, enough for the
source parsers to find elements by tag, class or id and read their visible text.
Not a general purpose parser: it assumes reasonably well formed HTML, which the
official pages are, and it never raises on odd markup."""
from __future__ import annotations

import html.parser
import re
from typing import Callable, Iterator

VOID_TAGS = frozenset({
    "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta",
    "param", "source", "track", "wbr",
})
# Content that is never part of the readable text.
SKIP_TAGS = frozenset({"script", "style", "noscript", "svg", "math", "annotation", "template"})
BLOCK_TAGS = frozenset({
    "p", "div", "section", "article", "li", "ul", "ol", "tr", "table", "br",
    "h1", "h2", "h3", "h4", "h5", "h6", "details", "summary", "blockquote", "pre",
})


class Node:
    __slots__ = ("tag", "attrs", "children", "parent")

    def __init__(self, tag: str, attrs: dict[str, str], parent: "Node | None") -> None:
        self.tag = tag
        self.attrs = attrs
        self.children: list[Node | str] = []
        self.parent = parent

    def classes(self) -> list[str]:
        return (self.attrs.get("class") or "").split()

    def has_class_containing(self, fragment: str) -> bool:
        return any(fragment in c for c in self.classes())

    def iter(self) -> Iterator["Node"]:
        """Every descendant element, in document order (not including self)."""
        stack: list[Node] = [c for c in reversed(self.children) if isinstance(c, Node)]
        while stack:
            node = stack.pop()
            yield node
            stack.extend(c for c in reversed(node.children) if isinstance(c, Node))

    def find_all(self, pred: Callable[["Node"], bool]) -> list["Node"]:
        return [n for n in self.iter() if pred(n)]

    def find(self, pred: Callable[["Node"], bool]) -> "Node | None":
        for n in self.iter():
            if pred(n):
                return n
        return None

    def child_elements(self) -> list["Node"]:
        return [c for c in self.children if isinstance(c, Node)]

    def text(self) -> str:
        """Visible text with block elements on their own line, whitespace collapsed."""
        parts: list[str] = []
        _collect(self, parts)
        raw = "".join(parts)
        raw = re.sub(r"[ \t ​]+", " ", raw)
        lines = [ln.strip() for ln in raw.split("\n")]
        return "\n".join(ln for ln in lines if ln)

    def inline_text(self) -> str:
        """Visible text on a single line."""
        return re.sub(r"\s+", " ", self.text()).strip()


def _collect(node: Node, parts: list[str]) -> None:
    for child in node.children:
        if isinstance(child, str):
            parts.append(child)
            continue
        if child.tag in SKIP_TAGS or child.attrs.get("aria-hidden") == "true":
            continue
        block = child.tag in BLOCK_TAGS
        if block:
            parts.append("\n")
        _collect(child, parts)
        if block:
            parts.append("\n")


class _Builder(html.parser.HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.root = Node("#root", {}, None)
        self.current = self.root

    def handle_starttag(self, tag: str, attrs) -> None:
        node = Node(tag, {k: (v or "") for k, v in attrs}, self.current)
        self.current.children.append(node)
        if tag not in VOID_TAGS:
            self.current = node

    def handle_startendtag(self, tag: str, attrs) -> None:
        node = Node(tag, {k: (v or "") for k, v in attrs}, self.current)
        self.current.children.append(node)

    def handle_endtag(self, tag: str) -> None:
        if tag in VOID_TAGS:
            return
        node: Node | None = self.current
        while node is not None and node.tag != tag:
            node = node.parent
        if node is not None and node.parent is not None:
            self.current = node.parent
        # An end tag with no matching open tag is ignored.

    def handle_data(self, data: str) -> None:
        self.current.children.append(data)


def parse_html(source: str) -> Node:
    builder = _Builder()
    builder.feed(source)
    builder.close()
    return builder.root
