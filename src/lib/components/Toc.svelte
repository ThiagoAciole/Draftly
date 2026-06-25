<script lang="ts">
  import SvgIcon from "../icons/SvgIcon.svelte";
  import { settings } from "../stores/settings.svelte.js";
  import { t } from "../utils/i18n.js";

  let {
    markdownBody,
    htmlContent,
    onBeforeJump,
    collapsedHeaders,
    ontoggleFold,
    oncopyref,
    oncontext,
    onjump,
    onshowTooltip,
    onhideTooltip,
  } = $props<{
    markdownBody: HTMLElement | null;
    htmlContent: string;
    onBeforeJump?: () => void;
    collapsedHeaders?: Set<string>;
    ontoggleFold?: (id: string) => void;
    oncopyref?: (text: string) => void;
    oncontext?: (e: MouseEvent, item: TocItem) => void;
    onjump?: (id: string, text: string) => void;
    onshowTooltip?: (
      e: MouseEvent,
      text: string,
      shortcut?: string,
      align?: "top" | "right" | "left" | "below",
    ) => void;
    onhideTooltip?: () => void;
  }>();

  interface TocItem {
    id: string;
    text: string;
    level: number;
    isBlock: boolean;
    hasChildren?: boolean;
  }

  let items = $state<TocItem[]>([]);
  let activeId = $state<string | null>(null);
  let tocContainer: HTMLElement | null = $state(null);
  let activeTargetEl: HTMLElement | null = null;

  // when user clicks a toc entry, lock active id until scroll catches up
  let clickLock: string | null = null;
  let clickLockTimer: ReturnType<typeof setTimeout> | null = null;

  $effect(() => {
    if (htmlContent && markdownBody) {
      const result: TocItem[] = [];

      const hs = markdownBody.querySelectorAll(
        "h1, h2, h3, h4, h5, h6",
      ) as NodeListOf<HTMLElement>;
      for (const h of Array.from(hs)) {
        let text = h.textContent || "";
        text = text.replace(/\s*\^[a-zA-Z0-9_-]+$/, "");
        const anchor = h.querySelector("a.anchor") as HTMLElement | null;
        const id = h.id || (anchor ? anchor.id : "");
        if (id) {
          result.push({
            id,
            text: text.trim(),
            level: parseInt(h.tagName[1], 10),
            isBlock: false,
          });
        }
      }

      const blockAnchors = markdownBody.querySelectorAll(
        "a[id].block-id-anchor, span[id].block-id-anchor",
      ) as NodeListOf<HTMLElement>;
      for (const el of Array.from(blockAnchors)) {
        const id = el.id;
        const label = el.getAttribute("data-label") || id;
        result.push({ id, text: label, level: 0, isBlock: true });
      }

      const allIds = new Map<string, number>();
      const allEls = markdownBody.querySelectorAll(
        "[id]",
      ) as NodeListOf<HTMLElement>;
      let order = 0;
      for (const el of Array.from(allEls)) {
        allIds.set(el.id, order++);
      }
      result.sort(
        (a, b) => (allIds.get(a.id) ?? 999) - (allIds.get(b.id) ?? 999),
      );

      for (let i = 0; i < result.length; i++) {
        const item = result[i];
        if (item.isBlock) continue;
        item.hasChildren = false;

        if (i + 1 < result.length) {
          const next = result[i + 1];
          if (next.isBlock || next.level > item.level) {
            item.hasChildren = true;
          }
        }
      }

      const currentFingerprint = items
        .map((i) => `${i.id}-${i.text}-${i.level}`)
        .join("|");
      const newFingerprint = result
        .map((i) => `${i.id}-${i.text}-${i.level}`)
        .join("|");

      if (currentFingerprint !== newFingerprint) {
        items = result;
      }
    } else {
      if (items.length > 0) items = [];
    }
  });

  function checkTruncation(node: HTMLElement) {
    const handleMouseOver = () => {
      if (node.scrollWidth > node.clientWidth) {
        node.title = node.innerText;
      } else {
        node.removeAttribute("title");
      }
    };
    node.addEventListener("mouseover", handleMouseOver);
    return {
      destroy() {
        node.removeEventListener("mouseover", handleMouseOver);
      },
    };
  }

  let visibleItems = $derived.by(() => {
    let result = [];
    let hideUntilLevel = 99;
    for (const item of items) {
      if (item.isBlock) {
        if (hideUntilLevel === 99) result.push(item);
        continue;
      }
      if (item.level <= hideUntilLevel) {
        hideUntilLevel = 99;
        result.push(item);
        const key = item.id || item.text || "";
        if (collapsedHeaders?.has(key)) {
          hideUntilLevel = item.level;
        }
      } else {
        if (hideUntilLevel === 99) {
          result.push(item);
          const key = item.id || item.text || "";
          if (collapsedHeaders?.has(key)) {
            hideUntilLevel = item.level;
          }
        }
      }
    }
    return result;
  });

  function handleScroll() {
    if (!markdownBody || items.length === 0) return;

    if (!clickLock && activeTargetEl) {
      activeTargetEl.classList.remove("toc-target-active");
      activeTargetEl = null;
    }

    if (clickLock) return;

    const containerRect = markdownBody.getBoundingClientRect();
    let currentActive = visibleItems[0]?.id || null;

    for (const item of visibleItems) {
      const el = markdownBody.querySelector(`[id="${CSS.escape(item.id)}"]`);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.top - containerRect.top < 150) {
          currentActive = item.id;
        } else {
          break;
        }
      }
    }

    if (activeId !== currentActive) {
      activeId = currentActive;
      scrollTocIntoView();
    }
  }

  function scrollTocIntoView() {
    if (tocContainer && activeId) {
      const activeEl = tocContainer.querySelector(
        `[data-id="${CSS.escape(activeId)}"]`,
      );
      if (activeEl)
        activeEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }

  $effect(() => {
    if (markdownBody) {
      markdownBody.addEventListener("scroll", handleScroll, { passive: true });
      return () => markdownBody.removeEventListener("scroll", handleScroll);
    }
  });

  import { slide } from "svelte/transition";
  import { cubicOut } from "svelte/easing";

  function jumpTo(id: string) {
    const el = markdownBody?.querySelector(
      `[id="${CSS.escape(id)}"]`,
    ) as HTMLElement | null;
    if (el && markdownBody) {
      onBeforeJump?.();
      // lock active id immediately so scroll handler doesn't override
      clickLock = id;
      activeId = id;
      scrollTocIntoView();

      const item = items.find((i) => i.id === id);
      if (item) onjump?.(id, item.text);

      // highlight element persistently until scroll
      if (activeTargetEl) activeTargetEl.classList.remove("toc-target-active");
      el.classList.add("toc-target-active");
      activeTargetEl = el;

      const containerRect = markdownBody.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const targetScrollTop =
        elRect.top - containerRect.top + markdownBody.scrollTop - 60;
      markdownBody.scrollTo({ top: targetScrollTop, behavior: "smooth" });

      // release lock after scroll settles
      if (clickLockTimer) clearTimeout(clickLockTimer);
      clickLockTimer = setTimeout(() => {
        clickLock = null;
      }, 600);
    }
  }
</script>

<div class="toc-container" bind:this={tocContainer}>
  <div class="toc-header" class:on-right={settings.tocSide === "right"}>
    <div class="toc-header-actions">
      <button
        class="toc-header-btn"
        onclick={() => {
          settings.toggleTocSide();
          onhideTooltip?.();
        }}
        onmouseenter={(e) =>
          onshowTooltip?.(
            e,
            t("tooltip.switchSide", settings.language),
            undefined,
            "below",
          )}
        onmouseleave={() => onhideTooltip?.()}
        aria-label={t("tooltip.switchSide", settings.language)}
      >
        <SvgIcon name="toc-1" />
      </button>
    </div>
  </div>
  {#if visibleItems.length > 0}
    <ul class="toc-list">
      {#each visibleItems as item (item.id)}
        <li
          transition:slide={{ duration: 240, easing: cubicOut }}
          class="toc-item {item.isBlock ? 'block-item' : `level-${item.level}`}"
          style="padding-left: {(Math.max(1, item.level || 2) - 1) * 10 +
            8}px !important"
        >
          {#if item.isBlock}
            <button
              class="toc-link toc-block {activeId === item.id ? 'active' : ''}"
              data-id={item.id}
              onclick={() => jumpTo(item.id)}
              use:checkTruncation
            >
              <SvgIcon name="toc-2" />
              {item.text}
            </button>
          {:else}
            <div class="toc-link-wrapper level-{item.level}">
              <button
                aria-label={t("tooltip.toggleFold", settings.language)}
                class="toc-fold-btn {collapsedHeaders?.has(
                  item.id || item.text || '',
                )
                  ? 'collapsed'
                  : ''}"
                style={item.hasChildren ? "" : "visibility: hidden"}
                onclick={(e) => {
                  e.stopPropagation();
                  ontoggleFold?.(item.id || item.text || "");
                }}
              >
                <SvgIcon name="toc-3" />
              </button>
              <button
                class="toc-link {activeId === item.id ? 'active' : ''}"
                data-id={item.id}
                onclick={() => jumpTo(item.id)}
                oncontextmenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  oncontext ? oncontext(e, item) : oncopyref?.(item.text);
                }}
                use:checkTruncation
              >
                {item.text}
              </button>
            </div>
          {/if}
        </li>
      {/each}
    </ul>
  {:else}
    <div class="toc-empty">{t("toc.noHeadingsFound", settings.language)}</div>
  {/if}
</div>

<style>
  .toc-container {
    width: 240px;
    flex-shrink: 0;
    height: 100%;
    background-color: transparent;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    font-family: var(--win-font);
    position: relative;
  }

  .toc-container::before {
    display: none;
  }

  .toc-header {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: 10px 14px;
    z-index: 60;
    flex-shrink: 0;
  }

  .toc-header.on-right {
    justify-content: flex-start;
  }

  .toc-header-actions {
    display: flex;
    gap: 4px;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .toc-header-btn {
    background: none;
    border: none;
    padding: 6px;
    cursor: pointer;
    color: var(--color-fg-muted);
    opacity: 0.7;
    border-radius: 4px;
    transition:
      opacity 0.2s,
      background-color 0.2s,
      color 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: auto;
  }

  .toc-container:hover .toc-header-btn {
    opacity: 0.8;
  }

  .toc-header-btn:hover {
    opacity: 1 !important;
    background-color: var(--color-canvas-subtle);
    color: var(--color-fg-default);
  }

  .toc-list {
    margin: 0;
    padding: 0 0 16px;
    list-style: none;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-gutter: stable;
    flex: 1;
    direction: rtl; /* move scrollbar to left */
    display: flex;
    flex-direction: column;
    -webkit-mask-image: linear-gradient(
      to bottom,
      transparent,
      black 8px,
      black calc(100% - 20px),
      transparent
    );
    mask-image: linear-gradient(
      to bottom,
      transparent,
      black 8px,
      black calc(100% - 20px),
      transparent
    );
  }

  .toc-empty {
    padding: 16px;
    color: var(--color-fg-muted);
    font-size: 13px;
    text-align: center;
  }

  .toc-item {
    padding: 1px 0;
    direction: ltr; /* keep text content ltr */
    width: 100%;
    box-sizing: border-box;
    overflow-x: hidden;
    flex-shrink: 0;
  }

  .toc-link-wrapper {
    display: flex;
    align-items: center;
    width: 100%;
  }

  .toc-fold-btn {
    background: none;
    border: none;
    padding: 4px;
    cursor: pointer;
    opacity: 0.5;
    color: var(--color-fg-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    transition:
      transform 0.2s ease,
      opacity 0.2s ease;
    border-radius: 4px;
    flex-shrink: 0;
    flex-grow: 0;
    width: 24px;
    height: 24px;
    box-sizing: border-box;
    margin: 0;
  }

  .toc-item:hover .toc-fold-btn,
  .toc-fold-btn.collapsed {
    opacity: 0.8;
  }

  .toc-fold-btn:hover {
    opacity: 1 !important;
  }

  .toc-fold-btn.collapsed {
    transform: rotate(-90deg);
  }

  .toc-link {
    display: block;
    width: 100%;
    text-align: left;
    background: none;
    border: none;
    padding: 3px 16px 3px 4px;
    color: var(--color-fg-muted);
    font-size: 13px;
    cursor: pointer;
    transition: color 0.1s ease;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: inherit;
    line-height: 20px;
    outline: none;
    user-select: none;
  }

  .toc-link:active {
    transform: none !important;
  }

  .toc-link:hover {
    color: var(--color-fg-default);
  }

  .toc-link.active {
    color: var(--color-fg-default);
    text-shadow: 0.5px 0 0 currentColor;
  }

  .toc-block {
    display: flex;
    align-items: center;
    gap: 5px;
    padding-left: 16px;
    font-size: 12.5px;
  }

  .block-icon {
    flex-shrink: 0;
    opacity: 0.4;
  }

  .level-1 .toc-link {
    font-weight: 500;
    font-size: 13px;
  }
  .level-3 .toc-link {
    font-size: 12.5px;
  }
  .level-4 .toc-link {
    font-size: 12px;
    opacity: 0.9;
  }
  .level-5 .toc-link {
    font-size: 12px;
    opacity: 0.8;
  }
  .level-6 .toc-link {
    font-size: 12px;
    opacity: 0.7;
  }
</style>
