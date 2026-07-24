import { useEffect, useState } from "react";

interface DocSearchResult {
  matches: Range[];
  activeIndex: number;
  count: number;
  goNext: () => void;
  goPrev: () => void;
}

function findMatches(containerEl: HTMLElement, query: string): Range[] {
  const needle = query.toLowerCase();
  const matches: Range[] = [];

  const walker = document.createTreeWalker(containerEl, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const tag = node.parentElement?.tagName;
      return tag === "SCRIPT" || tag === "STYLE" ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    },
  });

  let node: Text | null;
  // eslint-disable-next-line no-cond-assign
  while ((node = walker.nextNode() as Text | null)) {
    const text = node.data.toLowerCase();
    let from = 0;
    let index: number;
    while ((index = text.indexOf(needle, from)) !== -1) {
      const range = document.createRange();
      range.setStart(node, index);
      range.setEnd(node, index + needle.length);
      matches.push(range);
      from = index + needle.length;
    }
  }

  return matches;
}

export function useDocSearch(containerEl: HTMLElement | null, query: string, contentKey: unknown): DocSearchResult {
  const [matches, setMatches] = useState<Range[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  // Rescan on query change.
  useEffect(() => {
    if (!containerEl || !query) {
      setMatches([]);
      setActiveIndex(0);
      return;
    }
    setMatches(findMatches(containerEl, query));
    setActiveIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerEl, query]);

  // Rescan on content change (MDX renders async, mutating the subtree after mount).
  useEffect(() => {
    if (!containerEl || !query) return;
    const observer = new MutationObserver(() => {
      const next = findMatches(containerEl, query);
      setMatches(next);
      setActiveIndex((i) => Math.min(i, Math.max(next.length - 1, 0)));
    });
    observer.observe(containerEl, { childList: true, subtree: true });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerEl, query, contentKey]);

  // Apply/clear CSS Custom Highlight ranges as matches/activeIndex change.
  useEffect(() => {
    if (matches.length === 0) {
      CSS.highlights.delete("doc-search");
      CSS.highlights.delete("doc-search-active");
      return;
    }
    CSS.highlights.set("doc-search", new Highlight(...matches));
    CSS.highlights.set("doc-search-active", new Highlight(matches[activeIndex]));
    return () => {
      CSS.highlights.delete("doc-search");
      CSS.highlights.delete("doc-search-active");
    };
  }, [matches, activeIndex]);

  const goTo = (index: number) => {
    if (matches.length === 0) return;
    setActiveIndex(index);
    const target = matches[index];
    (target.startContainer.parentElement as Element | null)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  return {
    matches,
    activeIndex,
    count: matches.length,
    goNext: () => goTo((activeIndex + 1) % matches.length),
    goPrev: () => goTo((activeIndex - 1 + matches.length) % matches.length),
  };
}
