<script lang="ts">
  import MarkdownActionIcon, {
    type MarkdownActionIconName,
  } from "../icons/MarkdownActionIcon.svelte";
  import type { MarkdownToolbarAction } from "../utils/markdown-toolbar.js";

  let { onaction } = $props<{
    onaction: (action: MarkdownToolbarAction) => void;
  }>();

  let toolbar: HTMLDivElement;
  let isDragging = $state(false);
  let dragStartX = 0;
  let dragStartScrollLeft = 0;
  let suppressNextClick = false;

  function handlePointerDown(event: PointerEvent) {
    if (event.button !== 0 || toolbar.scrollWidth <= toolbar.clientWidth)
      return;

    dragStartX = event.clientX;
    dragStartScrollLeft = toolbar.scrollLeft;
    isDragging = true;
    suppressNextClick = false;
    toolbar.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent) {
    if (!isDragging) return;

    const distance = event.clientX - dragStartX;
    if (Math.abs(distance) > 4) {
      suppressNextClick = true;
    }

    toolbar.scrollLeft = dragStartScrollLeft - distance;
  }

  function handlePointerEnd(event: PointerEvent) {
    if (!isDragging) return;

    isDragging = false;
    if (toolbar.hasPointerCapture(event.pointerId)) {
      toolbar.releasePointerCapture(event.pointerId);
    }

    if (suppressNextClick) {
      setTimeout(() => {
        suppressNextClick = false;
      }, 0);
    }
  }

  function handleAction(action: MarkdownToolbarAction) {
    if (suppressNextClick) {
      suppressNextClick = false;
      return;
    }

    onaction(action);
  }

  const items: {
    action: MarkdownToolbarAction;
    icon: MarkdownActionIconName;
    title: string;
  }[] = [
    {
      action: "heading",
      icon: "heading",
      title: "Alternar título: H3 → H2 → H1 → normal",
    },
    { action: "bold", icon: "bold", title: "Negrito" },
    { action: "italic", icon: "italic", title: "Itálico" },
    { action: "inline-code", icon: "inline-code", title: "Código em linha" },
    { action: "code-block", icon: "code-block", title: "Bloco de código" },
    { action: "quote", icon: "quote", title: "Citação" },
    {
      action: "unordered-list",
      icon: "unordered-list",
      title: "Lista não ordenada",
    },
    {
      action: "ordered-list",
      icon: "ordered-list",
      title: "Lista ordenada",
    },
    { action: "link", icon: "link", title: "Link" },
    { action: "table", icon: "table", title: "Tabela" },
    {
      action: "horizontal-rule",
      icon: "horizontal-rule",
      title: "Linha horizontal",
    },
  ];
</script>

<div
  class="markdown-toolbar"
  class:dragging={isDragging}
  role="toolbar"
  aria-label="Formatação Markdown"
  bind:this={toolbar}
  onpointerdown={handlePointerDown}
  onpointermove={handlePointerMove}
  onpointerup={handlePointerEnd}
  onpointercancel={handlePointerEnd}
>
  {#each items as item}
    <button
      type="button"
      title={item.title}
      aria-label={item.title}
      onmousedown={(event) => event.preventDefault()}
      onclick={() => handleAction(item.action)}
    >
      <MarkdownActionIcon name={item.icon} />
    </button>
  {/each}
</div>

<style>
  .markdown-toolbar {
    position: absolute;
    left: 50%;
    bottom: 40px;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 2px;
    width: max-content;
    max-width: calc(100% - 24px);
    padding: 5px 7px;
    overflow-x: auto;
    overflow-y: hidden;
    transform: translateX(-50%);
    background: rgba(42, 42, 42, 0.96);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 7px;
    box-shadow:
      0 10px 30px rgba(0, 0, 0, 0.28),
      0 2px 8px rgba(0, 0, 0, 0.2);
    backdrop-filter: blur(12px);
    color: #c8c8c8;
    user-select: none;
    cursor: grab;
    scrollbar-width: none;
    -ms-overflow-style: none;
    touch-action: pan-y;
  }

  .markdown-toolbar::-webkit-scrollbar {
    display: none;
    width: 0;
    height: 0;
  }

  .markdown-toolbar.dragging {
    cursor: grabbing;
  }

  .markdown-toolbar.dragging button {
    pointer-events: none;
  }

  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    width: 30px;
    height: 30px;
    padding: 0;
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: inherit;
    cursor: inherit;
    transition:
      background-color 120ms ease,
      color 120ms ease,
      transform 120ms ease;
  }

  button:hover {
    background: rgba(255, 255, 255, 0.09);
    color: #ffffff;
  }

  button:active {
    transform: translateY(1px);
    background: rgba(255, 255, 255, 0.14);
  }

  button:focus-visible {
    outline: 2px solid var(--color-accent-fg);
    outline-offset: -2px;
  }

  :global(.markdown-toolbar svg) {
    pointer-events: none;
  }
</style>
