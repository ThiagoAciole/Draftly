<script lang="ts">
  import { onDestroy, onMount, tick } from "svelte";
  import { Editor } from "@tiptap/core";
  import StarterKit from "@tiptap/starter-kit";
  import Link from "@tiptap/extension-link";
  import Image from "@tiptap/extension-image";
  import { Table } from "@tiptap/extension-table";
  import TableRow from "@tiptap/extension-table-row";
  import TableHeader from "@tiptap/extension-table-header";
  import TableCell from "@tiptap/extension-table-cell";
  import TaskList from "@tiptap/extension-task-list";
  import TaskItem from "@tiptap/extension-task-item";
  import Placeholder from "@tiptap/extension-placeholder";
  import { settings } from "../stores/settings.svelte.js";
  import type { MarkdownToolbarAction } from "../utils/markdown-toolbar.js";
  import {
    prepareVisualEditorHtml,
    visualHtmlToMarkdown,
  } from "../utils/markdown-visual.js";
  import MarkdownToolbar from "./MarkdownToolbar.svelte";

  let {
    value = $bindable(),
    html,
    searchTarget = $bindable<HTMLElement | null>(null),
    onscroll,
    onclick,
    onkeydown,
    onchange,
  } = $props<{
    value: string;
    html: string;
    searchTarget?: HTMLElement | null;
    onscroll?: (event: Event) => void;
    onclick?: (event: MouseEvent) => void;
    onkeydown?: (event: KeyboardEvent) => void;
    onchange?: (value: string) => void;
  }>();

  let host: HTMLDivElement;
  let editor: Editor | null = null;
  let applyingExternalContent = false;
  let lastAppliedHtml = "";

  function setEditorContent(nextHtml: string) {
    if (!editor) return;

    const prepared = prepareVisualEditorHtml(nextHtml);
    if (prepared === lastAppliedHtml) return;

    applyingExternalContent = true;
    editor.commands.setContent(prepared, { emitUpdate: false });
    applyingExternalContent = false;
    lastAppliedHtml = prepared;
  }

  function applyToolbarAction(action: MarkdownToolbarAction) {
    if (!editor) return;

    const chain = editor.chain().focus();
    if (action === "heading") {
      if (editor.isActive("heading", { level: 1 })) {
        chain.setParagraph().run();
      } else if (editor.isActive("heading", { level: 2 })) {
        chain.toggleHeading({ level: 1 }).run();
      } else if (editor.isActive("heading", { level: 3 })) {
        chain.toggleHeading({ level: 2 }).run();
      } else {
        chain.toggleHeading({ level: 3 }).run();
      }
      return;
    }

    if (action === "bold") chain.toggleBold().run();
    if (action === "italic") chain.toggleItalic().run();
    if (action === "inline-code") chain.toggleCode().run();
    if (action === "code-block") chain.toggleCodeBlock().run();
    if (action === "quote") chain.toggleBlockquote().run();
    if (action === "unordered-list") chain.toggleBulletList().run();
    if (action === "ordered-list") chain.toggleOrderedList().run();
    if (action === "horizontal-rule") chain.setHorizontalRule().run();
    if (action === "table") {
      chain
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run();
    }
    if (action === "link") {
      const previousUrl = editor.getAttributes("link").href || "";
      const url = window.prompt("URL", previousUrl);
      if (url === null) return;
      if (url.trim() === "") {
        chain.unsetLink().run();
      } else {
        chain.extendMarkRange("link").setLink({ href: url.trim() }).run();
      }
    }
  }

  onMount(() => {
    editor = new Editor({
      element: host,
      extensions: [
        StarterKit.configure({
          link: false,
        }),
        Link.configure({
          openOnClick: false,
          autolink: true,
          linkOnPaste: true,
        }),
        Image,
        Table.configure({
          resizable: true,
        }),
        TableRow,
        TableHeader,
        TableCell,
        TaskList,
        TaskItem.configure({
          nested: true,
        }),
        Placeholder.configure({
          placeholder: "Comece a escrever...",
        }),
      ],
      editorProps: {
        attributes: {
          class: "visual-editor-prose",
        },
      },
      content: prepareVisualEditorHtml(html),
      onUpdate: ({ editor }) => {
        if (applyingExternalContent) return;
        const nextValue = visualHtmlToMarkdown(editor.getHTML());
        value = nextValue;
        onchange?.(nextValue);
      },
    });

    lastAppliedHtml = prepareVisualEditorHtml(html);
    searchTarget = host;
  });

  $effect(() => {
    const nextHtml = html;
    if (!editor) return;
    if (editor.isFocused) return;
    tick().then(() => setEditorContent(nextHtml));
  });

  onDestroy(() => {
    editor?.destroy();
    editor = null;
    if (searchTarget === host) searchTarget = null;
  });
</script>

<div
  bind:this={host}
  class="markdown-body full-width visual-markdown-editor"
  onscroll={onscroll}
  onclick={onclick}
  onkeydown={onkeydown}
  tabindex="0"
  role="textbox"
  aria-multiline="true"
  style="outline: none; font-family: {settings.previewFont}, sans-serif; font-size: {settings.previewFontSize}px; flex: 1;"
></div>

{#if settings.showMarkdownToolbar}
  <MarkdownToolbar onaction={applyToolbarAction} />
{/if}

<style>
  .visual-markdown-editor {
    cursor: text;
  }

  .visual-markdown-editor :global(.visual-editor-prose) {
    min-height: 100%;
    outline: none;
  }

  .visual-markdown-editor :global(.is-editor-empty:first-child::before) {
    color: var(--color-fg-muted);
    content: attr(data-placeholder);
    float: left;
    height: 0;
    pointer-events: none;
  }

  .visual-markdown-editor :global(a) {
    cursor: text;
  }
</style>
