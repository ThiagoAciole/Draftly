<script lang="ts">
  import { fly } from "svelte/transition";
  import { tick } from "svelte";
  import { t } from "../utils/i18n.js";
  import type { LanguageCode } from "../utils/i18n.js";

  let {
    open = $bindable(false),
    markdownBody,
    language = "en" as LanguageCode,
  } = $props<{
    open: boolean;
    markdownBody: HTMLElement | null;
    language?: LanguageCode;
  }>();

  const FIND_MARK_CLASS = "draftly-find-match";
  const FIND_MARK_ACTIVE_CLASS = "active";
  const MAX_MATCHES = 5000;
  const DEBOUNCE_MS = 80;

  let inputEl = $state<HTMLInputElement>();
  let replaceEl = $state<HTMLInputElement>();
  let query = $state("");
  let replaceText = $state("");
  let caseSensitive = $state(false);
  let wholeWord = $state(false);
  let showReplace = $state(false);
  let matchCount = $state(0);
  let activeIndex = $state(-1);
  let truncated = $state(false);
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let searchHistory = $state<string[]>([]);
  let showSearchHistory = $state(false);
  let focusedInput = $state<"find" | "replace">("find");

  function isHostElement(el: Element | null): boolean {
    if (!el) return false;
    // Skip elements whose text is not user-visible (script/style/noscript)
    // and our own find marks (to avoid re-walking already-highlighted text).
    // CODE and PRE intentionally NOT skipped: code blocks contain real
    // content the user expects to be searchable, even when highlight.js
    // has wrapped tokens in nested <span>s.
    const tag = el.tagName;
    return (
      tag === "SCRIPT" ||
      tag === "STYLE" ||
      tag === "NOSCRIPT" ||
      el.classList.contains(FIND_MARK_CLASS)
    );
  }

  function isInsideHost(node: Node, root: Element): boolean {
    let curr: Node | null = node.parentNode;
    while (curr && curr !== root) {
      if (curr.nodeType === Node.ELEMENT_NODE && isHostElement(curr as Element))
        return true;
      curr = curr.parentNode;
    }
    return false;
  }

  export function clearHighlights() {
    const root = markdownBody as HTMLElement | null;
    if (!root) return;
    const marks = Array.from(
      root.querySelectorAll(`mark.${FIND_MARK_CLASS}`),
    ) as HTMLElement[];
    for (const mark of marks) {
      const parent = mark.parentNode;
      if (!parent) continue;
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
      parent.removeChild(mark);
      parent.normalize();
    }
  }

  function findInTextNode(text: string, needle: string): number[] {
    // returns array of start indices for non-overlapping matches
    const indices: number[] = [];
    if (!needle) return indices;
    const haystack = caseSensitive ? text : text.toLowerCase();
    const search = caseSensitive ? needle : needle.toLowerCase();
    let from = 0;
    while (from <= haystack.length - search.length) {
      const i = haystack.indexOf(search, from);
      if (i === -1) break;
      if (wholeWord) {
        const before = i === 0 ? "" : haystack.charAt(i - 1);
        const after = haystack.charAt(i + search.length);
        const isBoundary = (c: string) => c === "" || !/[\p{L}\p{N}_]/u.test(c);
        if (!isBoundary(before) || !isBoundary(after)) {
          from = i + 1;
          continue;
        }
      }
      indices.push(i);
      from = i + search.length;
    }
    return indices;
  }

  function applyHighlights() {
    if (!markdownBody) {
      matchCount = 0;
      activeIndex = -1;
      truncated = false;
      return;
    }
    clearHighlights();
    if (!query) {
      matchCount = 0;
      activeIndex = -1;
      truncated = false;
      return;
    }

    const root = markdownBody;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node: Node) {
        const text = (node as Text).nodeValue;
        if (!text) return NodeFilter.FILTER_REJECT;
        if (isInsideHost(node, root)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    let total = 0;
    let hitCap = false;

    // Walk and process in a single pass. We advance the walker BEFORE
    // mutating each text node so its internal currentNode never points
    // at a detached node — replaceChild on the previous text node would
    // otherwise leave the walker in an undefined state.
    let textNode = walker.nextNode() as Text | null;
    while (textNode) {
      const next = walker.nextNode() as Text | null;

      const text = textNode.nodeValue || "";
      const indices = findInTextNode(text, query);
      if (indices.length > 0) {
        const parent = textNode.parentNode;
        if (parent) {
          const doc = textNode.ownerDocument || document;
          const frag = doc.createDocumentFragment();
          let cursor = 0;
          let breakOut = false;
          for (const i of indices) {
            if (total >= MAX_MATCHES) {
              hitCap = true;
              breakOut = true;
              break;
            }
            if (i > cursor)
              frag.appendChild(doc.createTextNode(text.slice(cursor, i)));
            const mark = doc.createElement("mark");
            mark.className = FIND_MARK_CLASS;
            mark.textContent = text.slice(i, i + query.length);
            frag.appendChild(mark);
            cursor = i + query.length;
            total++;
          }
          if (cursor < text.length)
            frag.appendChild(doc.createTextNode(text.slice(cursor)));
          parent.replaceChild(frag, textNode);
          if (breakOut) break;
        }
      }
      textNode = next;
    }

    matchCount = total;
    truncated = hitCap;
    if (total === 0) {
      activeIndex = -1;
    } else {
      activeIndex = 0;
      setActive(0);
    }
  }

  function getMarks(): HTMLElement[] {
    const root = markdownBody as HTMLElement | null;
    if (!root) return [];
    return Array.from(
      root.querySelectorAll(`mark.${FIND_MARK_CLASS}`),
    ) as HTMLElement[];
  }

  function setActive(index: number, scroll: boolean = true) {
    const marks = getMarks();
    if (marks.length === 0) {
      activeIndex = -1;
      return;
    }
    const safe = ((index % marks.length) + marks.length) % marks.length;
    marks.forEach((m, i) =>
      m.classList.toggle(FIND_MARK_ACTIVE_CLASS, i === safe),
    );
    activeIndex = safe;
    if (scroll) {
      marks[safe].scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }

  export function next() {
    if (matchCount === 0) return;
    setActive(activeIndex + 1);
  }

  export function prev() {
    if (matchCount === 0) return;
    setActive(activeIndex - 1);
  }

  function loadSearchHistory() {
    try {
      const stored = localStorage.getItem("draftly:search-history");
      if (stored) {
        searchHistory = JSON.parse(stored);
      }
    } catch {
      searchHistory = [];
    }
  }

  function saveToSearchHistory(text: string) {
    if (!text.trim()) return;
    const filtered = searchHistory.filter((h) => h !== text);
    filtered.unshift(text);
    searchHistory = filtered.slice(0, 50);
    try {
      localStorage.setItem(
        "draftly:search-history",
        JSON.stringify(searchHistory),
      );
    } catch {
      // ignore
    }
  }

  function replaceOne() {
    if (matchCount === 0) return;
    const marks = getMarks();
    if (marks.length === 0) return;

    const activeMark = marks[activeIndex];
    if (!activeMark.parentNode) return;

    const text = activeMark.textContent || "";
    const newNode = document.createTextNode(replaceText);
    activeMark.parentNode.replaceChild(newNode, activeMark);

    // Re-apply highlights
    applyHighlights();
    // Move to next match
    if (activeIndex < matchCount - 1) {
      next();
    }
  }

  function replaceAll() {
    if (matchCount === 0) return;
    const marks = getMarks();
    for (const mark of marks) {
      if (!mark.parentNode) continue;
      const newNode = document.createTextNode(replaceText);
      mark.parentNode.replaceChild(newNode, mark);
    }
    // Re-apply highlights
    clearHighlights();
    matchCount = 0;
    activeIndex = -1;
  }

  function cancelPendingApply() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  }

  function scheduleApply() {
    cancelPendingApply();
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      // Guard against a stale timer firing after the bar has closed
      // (e.g. parent flips `open` to false on tab switch without
      // going through close()).
      if (!open) return;
      applyHighlights();
    }, DEBOUNCE_MS);
  }

  export function reapply() {
    // Public hook for parent: call after the preview HTML is replaced
    // so existing matches survive across re-renders.
    applyHighlights();
  }

  function close() {
    cancelPendingApply();
    clearHighlights();
    query = "";
    replaceText = "";
    matchCount = 0;
    activeIndex = -1;
    truncated = false;
    showReplace = false;
    showSearchHistory = false;
    open = false;
  }

  $effect(() => {
    // Re-run search when query/options change.
    // Touch reactive dependencies explicitly so $effect tracks them.
    query;
    caseSensitive;
    wholeWord;
    if (!open) return;
    scheduleApply();
    // Save to history when query changes
    if (query && query.length > 2) {
      saveToSearchHistory(query);
    }
  });

  $effect(() => {
    if (!open) {
      // External close (e.g. parent flipping `open` on tab switch).
      // Drop any pending debounced re-search so it can't fire after
      // we've already cleared the DOM.
      cancelPendingApply();
      clearHighlights();
      return;
    }
    // On open, load history and focus find input
    loadSearchHistory();
    tick().then(() => {
      inputEl?.focus();
      inputEl?.select();
    });
  });

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
      return;
    }

    // Tab navigation between find and replace
    if (e.key === "Tab") {
      e.preventDefault();
      e.stopPropagation();
      if (e.shiftKey) {
        focusedInput = focusedInput === "replace" ? "find" : "replace";
      } else {
        focusedInput = focusedInput === "find" ? "replace" : "find";
      }
      if (focusedInput === "find") {
        inputEl?.focus();
      } else if (showReplace) {
        replaceEl?.focus();
      }
      return;
    }

    // Navigate matches
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      if (focusedInput === "replace" && showReplace) {
        replaceOne();
      } else {
        if (e.shiftKey) prev();
        else next();
      }
      return;
    }

    // Ctrl/Cmd+G for next/prev match
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "g") {
      e.preventDefault();
      e.stopPropagation();
      if (e.shiftKey) prev();
      else next();
      return;
    }

    // Ctrl/Cmd+Shift+H for Replace All
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "H") {
      e.preventDefault();
      e.stopPropagation();
      replaceAll();
      return;
    }

    // Ctrl/Cmd+Shift+1 for Replace One
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "!") {
      e.preventDefault();
      e.stopPropagation();
      replaceOne();
      return;
    }
  }

  function countLabel(): string {
    if (!query) return "";
    if (matchCount === 0) return t("find.noMatches", language);
    const total = truncated ? `${MAX_MATCHES}+` : String(matchCount);
    return t("find.matchCount", language)
      .replace("{{current}}", String(activeIndex + 1))
      .replace("{{total}}", total);
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="find-bar"
    role="search"
    transition:fly={{ y: -8, duration: 120 }}
    onkeydown={handleKeydown}
  >
    <div class="find-bar-column">
      <div class="find-input-wrap">
        <svg
          class="find-icon"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          bind:this={inputEl}
          bind:value={query}
          type="text"
          class="find-input"
          placeholder={t("find.placeholder", language)}
          aria-label={t("find.placeholder", language)}
          spellcheck="false"
          autocomplete="off"
          onfocus={() => {
            focusedInput = "find";
            showSearchHistory = true;
          }}
          onblur={() => (showSearchHistory = false)}
        />
        <span class="find-count" class:no-matches={!!query && matchCount === 0}>
          {countLabel()}
        </span>
        {#if showSearchHistory && searchHistory.length > 0}
          <div class="search-history-dropdown">
            {#each searchHistory.slice(0, 10) as hist}
              <button
                type="button"
                class="history-item"
                onclick={() => {
                  query = hist;
                  showSearchHistory = false;
                  inputEl?.focus();
                }}
              >
                {hist}
              </button>
            {/each}
          </div>
        {/if}
      </div>

      {#if showReplace}
        <div class="find-input-wrap">
          <svg
            class="find-icon"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <polygon points="12 3 20 7 20 17 12 21 4 17 4 7 12 3"></polygon>
          </svg>
          <input
            bind:this={replaceEl}
            bind:value={replaceText}
            type="text"
            class="find-input"
            placeholder="Replace with..."
            aria-label="Replace with"
            spellcheck="false"
            autocomplete="off"
            onfocus={() => (focusedInput = "replace")}
          />
        </div>
      {/if}

      <div class="find-controls">
        <button
          type="button"
          class="find-toggle"
          class:active={caseSensitive}
          title={t("find.caseSensitive", language)}
          aria-label={t("find.caseSensitive", language)}
          aria-pressed={caseSensitive}
          onclick={() => (caseSensitive = !caseSensitive)}
        >
          Aa
        </button>
        <button
          type="button"
          class="find-toggle"
          class:active={wholeWord}
          title={t("find.wholeWord", language)}
          aria-label={t("find.wholeWord", language)}
          aria-pressed={wholeWord}
          onclick={() => (wholeWord = !wholeWord)}
        >
          ab|
        </button>

        <div class="find-divider"></div>

        <button
          type="button"
          class="find-btn"
          title={t("find.previous", language)}
          aria-label={t("find.previous", language)}
          disabled={matchCount === 0}
          onclick={prev}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <polyline points="18 15 12 9 6 15"></polyline>
          </svg>
        </button>
        <button
          type="button"
          class="find-btn"
          title={t("find.next", language)}
          aria-label={t("find.next", language)}
          disabled={matchCount === 0}
          onclick={next}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>

        <div class="find-divider"></div>

        <button
          type="button"
          class="find-btn"
          class:active={showReplace}
          title="Toggle Replace (Ctrl+H)"
          aria-label="Toggle Replace"
          onclick={() => (showReplace = !showReplace)}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M17 1H5c-1.1 0-2 .9-2 2v2h2V3h12v10h2V3c0-1.1-.9-2-2-2z"
            ></path>
            <path
              d="M3 15h10c1.1 0 2 .9 2 2v2c0 1.1-.9 2-2 2H3c-1.1 0-2-.9-2-2v-2c0-1.1.9-2 2-2z"
            ></path>
          </svg>
        </button>

        {#if showReplace}
          <button
            type="button"
            class="find-btn"
            title="Replace (Ctrl+Shift+1)"
            aria-label="Replace"
            disabled={matchCount === 0}
            onclick={replaceOne}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M3 5v14h16V5H3z"></path>
              <line x1="7" y1="9" x2="17" y2="9"></line>
              <line x1="7" y1="13" x2="17" y2="13"></line>
            </svg>
          </button>
          <button
            type="button"
            class="find-btn"
            title="Replace All (Ctrl+Shift+H)"
            aria-label="Replace All"
            disabled={matchCount === 0}
            onclick={replaceAll}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M3 5v14h16V5H3z M3 12h16"></path>
            </svg>
          </button>
        {/if}

        <button
          type="button"
          class="find-btn"
          title={t("find.close", language)}
          aria-label={t("find.close", language)}
          onclick={close}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .find-bar {
    position: fixed;
    top: 54px;
    right: 52px;
    transform: none;
    z-index: 10020;
    display: flex;
    align-items: flex-start;
    gap: 4px;
    padding: 4px 6px;
    width: fit-content;
    max-width: calc(100vw - 84px);
    background: var(--bg-tertiary, var(--color-canvas-subtle));
    border: 1px solid var(--color-border-muted);
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    font-size: 12px;
    color: var(--text-primary, var(--color-fg-default));
    user-select: none;
  }

  .find-bar-column {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .find-controls {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .find-input-wrap {
    position: relative;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 2px 6px;
    background: var(--color-canvas-default);
    border: 1px solid var(--color-border-muted);
    border-radius: 4px;
    flex: 0 0 auto;
    width: max-content;
    min-width: 160px;
  }

  .find-input-wrap:focus-within {
    border-color: var(--color-accent-fg);
  }

  .search-history-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: 2px;
    background: var(--color-canvas-default);
    border: 1px solid var(--color-border-muted);
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    max-height: 200px;
    overflow-y: auto;
    z-index: 10021;
  }

  .history-item {
    display: block;
    width: 100%;
    padding: 6px 8px;
    text-align: left;
    border: none;
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .history-item:hover {
    background: var(--color-neutral-muted, rgba(128, 128, 128, 0.15));
  }

  .find-icon {
    flex-shrink: 0;
    opacity: 0.6;
  }

  .find-input {
    flex: 0 1 auto;
    width: 14ch;
    min-width: 0;
    border: none;
    outline: none;
    background: transparent;
    color: inherit;
    font: inherit;
    padding: 4px 0;
  }

  .find-count {
    flex-shrink: 0;
    font-size: 11px;
    opacity: 0.7;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .find-count.no-matches {
    color: #d73a49;
    opacity: 1;
  }

  .find-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 24px;
    height: 24px;
    padding: 0 4px;
    border: 1px solid transparent;
    border-radius: 4px;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 11px;
    cursor: pointer;
    font-family: inherit;
  }

  .find-toggle:hover {
    background: var(--color-neutral-muted, rgba(128, 128, 128, 0.15));
  }

  .find-toggle.active {
    background: var(--color-accent-subtle, rgba(67, 138, 243, 0.25));
    border-color: var(--color-accent-fg);
    color: var(--color-accent-fg);
  }

  .find-divider {
    width: 1px;
    height: 18px;
    background: var(--color-border-muted);
    margin: 0 2px;
  }

  .find-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: inherit;
    cursor: pointer;
  }

  .find-btn:hover:not(:disabled) {
    background: var(--color-neutral-muted, rgba(128, 128, 128, 0.15));
  }

  .find-btn:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .find-btn.active {
    background: var(--color-accent-subtle, rgba(67, 138, 243, 0.25));
    border-color: var(--color-accent-fg);
    color: var(--color-accent-fg);
  }

  :global(.markdown-body mark.draftly-find-match) {
    background-color: var(--highlight-color, rgba(255, 208, 0, 0.4));
    color: inherit;
    padding: 0;
    border-radius: 2px;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.05);
  }

  :global(.markdown-body mark.draftly-find-match.active) {
    background-color: #ff8c00;
    color: #000;
    box-shadow:
      0 0 0 1px #ff8c00,
      0 0 0 3px rgba(255, 140, 0, 0.25);
  }
</style>
