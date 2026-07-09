import { ChevronDown, ChevronUp, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type SearchBarProps = {
  onClose: () => void;
};

type TextRange = {
  node: Text;
  start: number;
  end: number;
};

export function SearchBar({ onClose }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [matchIndex, setMatchIndex] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const matchesRef = useRef<TextRange[]>([]);

  const getEditor = (): HTMLElement | null =>
    document.querySelector(".blocknote-editor [contenteditable]");

  const getTextNodes = useCallback((el: HTMLElement): Text[] => {
    const nodes: Text[] = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let n: Text | null;
    while ((n = walker.nextNode() as Text | null)) {
      nodes.push(n);
    }
    return nodes;
  }, []);

  const findMatches = useCallback(
    (q: string): TextRange[] => {
      const editor = getEditor();
      if (!editor || !q) return [];

      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "gi");
      const results: TextRange[] = [];
      const textNodes = getTextNodes(editor);

      for (const node of textNodes) {
        const text = node.textContent ?? "";
        regex.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = regex.exec(text)) !== null) {
          results.push({
            node,
            start: m.index,
            end: m.index + m[0].length,
          });
          if (m[0].length === 0) regex.lastIndex++;
        }
      }

      return results;
    },
    [getTextNodes],
  );

  const clearHighlights = useCallback(() => {
    try {
      CSS.highlights.delete("search-matches");
      CSS.highlights.delete("search-active");
    } catch {
      // not supported
    }
  }, []);

  const applyHighlights = useCallback(
    (allMatches: TextRange[], activeIdx: number) => {
      clearHighlights();

      if (typeof Highlight === "undefined") return;
      if (allMatches.length === 0) return;

      try {
        const allRanges = allMatches.map(
          (m) =>
            new StaticRange({
              startContainer: m.node,
              startOffset: m.start,
              endContainer: m.node,
              endOffset: m.end,
            }),
        );
        const allHighlight = new Highlight(...allRanges);
        CSS.highlights.set("search-matches", allHighlight);

        if (activeIdx > 0 && activeIdx <= allMatches.length) {
          const active = allMatches[activeIdx - 1];
          const activeHighlight = new Highlight(
            new StaticRange({
              startContainer: active.node,
              startOffset: active.start,
              endContainer: active.node,
              endOffset: active.end,
            }),
          );
          CSS.highlights.set("search-active", activeHighlight);
        }
      } catch {
        // fallback silently — API may not be available
      }
    },
    [clearHighlights],
  );

  const scrollToMatch = useCallback((match: TextRange) => {
    try {
      const range = document.createRange();
      range.setStart(match.node, match.start);
      range.setEnd(match.node, match.end);
      const rect = range.getBoundingClientRect();
      range.detach();

      const editorScroll = match.node.parentElement?.closest(".editor-scroll");
      if (editorScroll && rect) {
        const scrollRect = editorScroll.getBoundingClientRect();
        const targetY =
          editorScroll.scrollTop + rect.top - scrollRect.top - scrollRect.height * 0.4;
        editorScroll.scrollTo({ top: Math.max(0, targetY), behavior: "smooth" });
      }
    } catch {
      // ignore
    }
  }, []);

  const refocusInput = () => {
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  const gotoNext = useCallback(() => {
    const count = matchesRef.current.length;
    if (count === 0) return;
    const next = matchIndex >= count ? 1 : matchIndex + 1;
    setMatchIndex(next);
    applyHighlights(matchesRef.current, next);
    scrollToMatch(matchesRef.current[next - 1]);
    refocusInput();
  }, [matchIndex, applyHighlights, scrollToMatch]);

  const gotoPrev = useCallback(() => {
    const count = matchesRef.current.length;
    if (count === 0) return;
    const prev = matchIndex <= 1 ? count : matchIndex - 1;
    setMatchIndex(prev);
    applyHighlights(matchesRef.current, prev);
    scrollToMatch(matchesRef.current[prev - 1]);
    refocusInput();
  }, [matchIndex, applyHighlights, scrollToMatch]);

  const handleClear = () => {
    setQuery("");
    clearHighlights();
    matchesRef.current = [];
    setMatchCount(0);
    setMatchIndex(0);
    inputRef.current?.focus();
  };

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    return () => clearHighlights();
  }, [clearHighlights]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        clearHighlights();
        onClose();
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClick);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [onClose, clearHighlights]);

  useEffect(() => {
    if (!query) {
      clearHighlights();
      matchesRef.current = [];
      setMatchCount(0);
      setMatchIndex(0);
      return;
    }

    const timer = setTimeout(() => {
      const matches = findMatches(query);
      matchesRef.current = matches;
      setMatchCount(matches.length);

      if (matches.length > 0) {
        setMatchIndex(1);
        applyHighlights(matches, 1);
        scrollToMatch(matches[0]);
        refocusInput();
      } else {
        setMatchIndex(0);
        clearHighlights();
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query, findMatches, applyHighlights, clearHighlights, scrollToMatch]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        clearHighlights();
        onClose();
      } else if (e.key === "Enter" && query) {
        e.preventDefault();
        if (e.shiftKey) {
          gotoPrev();
        } else {
          gotoNext();
        }
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [query, gotoNext, gotoPrev, onClose, clearHighlights]);

  const hasQuery = query.length > 0;
  const hasMatches = matchCount > 0;

  return (
    <div className="search-bar" ref={barRef}>
      <div className="search-bar-input-wrap">
        <Search size={14} className="search-bar-input-icon" />
        <input
          ref={inputRef}
          className="search-bar-input"
          type="text"
          placeholder="Buscar..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {hasQuery ? (
        <>
          <span className="search-bar-count">
            {hasMatches ? `${matchIndex} de ${matchCount}` : "Nenhum"}
          </span>

          <button
            className="search-bar-nav"
            type="button"
            aria-label="Anterior"
            title="Anterior (Shift+Enter)"
            disabled={!hasMatches}
            onClick={gotoPrev}
          >
            <ChevronUp size={16} />
          </button>
          <button
            className="search-bar-nav"
            type="button"
            aria-label="Próximo"
            title="Próximo (Enter)"
            disabled={!hasMatches}
            onClick={gotoNext}
          >
            <ChevronDown size={16} />
          </button>

          <button
            className="search-bar-clear"
            type="button"
            aria-label="Limpar busca"
            title="Limpar"
            onClick={handleClear}
          >
            <Trash2 size={15} />
          </button>
        </>
      ) : null}
    </div>
  );
}
