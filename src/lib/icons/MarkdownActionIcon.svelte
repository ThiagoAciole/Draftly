<script lang="ts">
  export type MarkdownActionIconName =
    | "heading"
    | "bold"
    | "italic"
    | "inline-code"
    | "code-block"
    | "quote"
    | "unordered-list"
    | "ordered-list"
    | "link"
    | "table"
    | "horizontal-rule"
    | "checklist";

  let {
    name,
    width = "18",
    height = "18",
  } = $props<{
    name: MarkdownActionIconName;
    width?: string;
    height?: string;
  }>();
</script>

<svg
  viewBox="0 0 24 24"
  {width}
  {height}
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  {#if name === "heading"}
    <path d="M5 5v14M19 5v14M5 12h14"></path>
    <path d="M15.5 5h3.5" opacity="0.55"></path>
  {:else if name === "bold"}
    <path d="M7 4h7a4 4 0 0 1 0 8H7z"></path>
    <path d="M7 12h8a4 4 0 0 1 0 8H7z"></path>
  {:else if name === "italic"}
    <path d="M14 4h5M5 20h5M15 4 9 20"></path>
  {:else if name === "inline-code"}
    <path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"></path>
  {:else if name === "code-block"}
    <path d="M4 5h5M4 5v14M4 19h5M20 5h-5M20 5v14M20 19h-5"></path>
    <path d="m10 9-3 3 3 3M14 9l3 3-3 3"></path>
  {:else if name === "quote"}
    <path d="M7 17h4V9H5v5h3c0 2-1 3-3 4"></path>
    <path d="M17 17h4V9h-6v5h3c0 2-1 3-3 4"></path>
  {:else if name === "unordered-list"}
    <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none"></circle>
    <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none"></circle>
    <circle cx="4" cy="18" r="1" fill="currentColor" stroke="none"></circle>
    <path d="M9 6h11M9 12h11M9 18h11"></path>
  {:else if name === "ordered-list"}
    <path d="M3 5h1v3M3 8h2M3 12h2l-2 3h2M3 18h2v3H3"></path>
    <path d="M9 6h11M9 13h11M9 20h11"></path>
  {:else if name === "link"}
    <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2"></path>
    <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.2"></path>
  {:else if name === "table"}
    <rect x="3" y="4" width="18" height="16" rx="1"></rect>
    <path d="M3 10h18M3 15h18M9 4v16M15 4v16"></path>
  {:else if name === "horizontal-rule"}
    <path d="M4 12h16"></path>
    <path d="m7 9-3 3 3 3M17 9l3 3-3 3" opacity="0.65"></path>
  {:else if name === "checklist"}
    <rect x="4" y="5" width="3" height="3" rx="0.5"></rect>
    <rect x="4" y="10.5" width="3" height="3" rx="0.5"></rect>
    <rect x="4" y="16" width="3" height="3" rx="0.5"></rect>
    <path d="M10 6.5h10M10 12h10M10 17.5h10"></path>
  {/if}
</svg>
