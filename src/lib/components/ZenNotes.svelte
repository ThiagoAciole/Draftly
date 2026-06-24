<script lang="ts">
  import DOMPurify from "dompurify";
  import { onDestroy, onMount } from "svelte";
  import { settings } from "../stores/settings.svelte.js";
  import type { MarkdownToolbarAction } from "../utils/markdown-toolbar.js";
  import MarkdownToolbar from "./MarkdownToolbar.svelte";

  let { searchTarget = $bindable<HTMLElement | null>(null) } = $props<{
    searchTarget?: HTMLElement | null;
  }>();

  type ZenSection = {
    key: string;
    label: string;
    contentHtml: string;
  };

  type SlashCommandId = MarkdownToolbarAction | "checklist";
  type SlashCommandIcon = MarkdownToolbarAction | "checklist";

  type SlashCommand = {
    id: SlashCommandId;
    icon: SlashCommandIcon;
    label: string;
    description: string;
    keywords: string[];
  };

  const CONTENT_KEY = "zenNotes.sections.v1";
  const LEGACY_CONTENT_KEY = "zenNotes.markdown";
  const LAST_DATE_KEY = "zenNotes.lastWriteDate";
  const PERSIST_DELAY_MS = 500;

  const EDITOR_ALLOWED_TAGS = [
    "p",
    "br",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "code",
    "pre",
    "blockquote",
    "ul",
    "ol",
    "li",
    "a",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
  ];

  const EDITOR_ALLOWED_ATTR = [
    "href",
    "target",
    "rel",
    "data-placeholder",
    "data-list-type",
    "class",
  ];
  const BLOCK_SELECTOR = "p, h1, h2, h3, h4, h5, h6, blockquote, li, pre";
  const slashCommands: SlashCommand[] = [
    {
      id: "heading",
      icon: "heading",
      label: "Titulo",
      description: "Insere um bloco de titulo",
      keywords: ["titulo", "heading", "h1", "h2", "h3"],
    },
    {
      id: "bold",
      icon: "bold",
      label: "Negrito",
      description: "Insere texto em negrito",
      keywords: ["bold", "forte", "strong", "negrito"],
    },
    {
      id: "italic",
      icon: "italic",
      label: "Italico",
      description: "Insere texto em italico",
      keywords: ["italic", "italico", "emfase"],
    },
    {
      id: "inline-code",
      icon: "inline-code",
      label: "Codigo inline",
      description: "Insere codigo na mesma linha",
      keywords: ["codigo", "code", "inline", "snippet"],
    },
    {
      id: "code-block",
      icon: "code-block",
      label: "Bloco de codigo",
      description: "Insere um bloco de codigo",
      keywords: ["codigo", "codeblock", "pre", "bloco"],
    },
    {
      id: "quote",
      icon: "quote",
      label: "Citacao",
      description: "Insere um bloco de citacao",
      keywords: ["quote", "citacao", "blockquote"],
    },
    {
      id: "unordered-list",
      icon: "unordered-list",
      label: "Lista",
      description: "Insere uma lista com marcadores",
      keywords: ["lista", "bullet", "unordered", "marcadores"],
    },
    {
      id: "ordered-list",
      icon: "ordered-list",
      label: "Lista numerada",
      description: "Insere uma lista numerada",
      keywords: ["lista", "ordenada", "ordered", "numerada"],
    },
    {
      id: "checklist",
      icon: "checklist",
      label: "Checklist",
      description: "Insere uma lista de tarefas",
      keywords: ["checklist", "todo", "tarefas", "checkbox"],
    },
    {
      id: "link",
      icon: "link",
      label: "Link",
      description: "Insere um link",
      keywords: ["link", "url", "href"],
    },
    {
      id: "table",
      icon: "table",
      label: "Tabela",
      description: "Insere uma tabela basica",
      keywords: ["table", "tabela", "coluna", "linha"],
    },
    {
      id: "horizontal-rule",
      icon: "horizontal-rule",
      label: "Divider",
      description: "Insere uma linha horizontal",
      keywords: ["divider", "linha", "horizontal", "hr", "separador"],
    },
  ];

  let sections = $state<ZenSection[]>([]);
  let activeSectionKey = $state("");
  let collapsedSections = $state<Record<string, boolean>>({});
  let slashMenu = $state({
    open: false,
    sectionKey: "",
    x: 0,
    y: 0,
    query: "",
    selectedIndex: 0,
  });
  let persistTimer: ReturnType<typeof setTimeout> | null = null;
  const editorRefs = new Map<string, HTMLDivElement>();
  let slashMenuRange: Range | null = null;
  let slashMenuBlock: HTMLElement | null = null;

  const todayKey = $derived(getLocalDateKey());

  function getLocalDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function getDisplayDate(date = new Date()) {
    return new Intl.DateTimeFormat(settings.language || "pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(date);
  }

  function sanitizeEditorHtml(rawHtml: string) {
    const clean = DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: EDITOR_ALLOWED_TAGS,
      ALLOWED_ATTR: EDITOR_ALLOWED_ATTR,
    }).trim();

    return clean || "<p><br></p>";
  }

  function escapeHtml(text: string) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function convertLegacyMarkdownToSections(legacyMarkdown: string) {
    const pattern =
      /(?:<!-- zen-date:([0-9]{4}-[0-9]{2}-[0-9]{2}) -->\n\n)?---\n\n## ([^\n]+)\n\n?/g;
    const matches = Array.from(legacyMarkdown.matchAll(pattern));
    if (matches.length === 0) {
      const text = legacyMarkdown.trim();
      if (!text) return [];
      return [
        {
          key: getLocalDateKey(),
          label: getDisplayDate(),
          contentHtml: `<p>${escapeHtml(text).replace(/\n/g, "<br>")}</p>`,
        },
      ];
    }

    return matches.map((match, index) => {
      const start = (match.index || 0) + match[0].length;
      const nextIndex = matches[index + 1]?.index ?? legacyMarkdown.length;
      const body = legacyMarkdown.slice(start, nextIndex).trim();
      const contentHtml = body
        ? `<p>${escapeHtml(body).replace(/\n\n+/g, "</p><p>").replace(/\n/g, "<br>")}</p>`
        : "<p><br></p>";

      return {
        key: match[1] || match[2].trim(),
        label: match[2].trim(),
        contentHtml,
      };
    });
  }

  function ensureTodaySection() {
    const key = getLocalDateKey();
    const existing = sections.find((section) => section.key === key);
    if (existing) {
      localStorage.setItem(LAST_DATE_KEY, key);
      return existing;
    }

    const created: ZenSection = {
      key,
      label: getDisplayDate(),
      contentHtml: "<p><br></p>",
    };
    sections = [...sections, created];
    activeSectionKey = key;
    localStorage.setItem(LAST_DATE_KEY, key);
    schedulePersist();
    return created;
  }

  function schedulePersist() {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(persist, PERSIST_DELAY_MS);
  }

  function persist() {
    sections = sections.map((section) => ({
      ...section,
      contentHtml: sanitizeEditorHtml(section.contentHtml),
    }));
    localStorage.setItem(CONTENT_KEY, JSON.stringify(sections));
  }

  function removeEditorRef(key: string) {
    editorRefs.delete(key);
  }

  function editorRef(node: HTMLDivElement, key: string) {
    editorRefs.set(key, node);
    return {
      update(nextKey: string) {
        if (nextKey === key) return;
        removeEditorRef(key);
        key = nextKey;
        editorRefs.set(key, node);
      },
      destroy() {
        removeEditorRef(key);
      },
    };
  }

  function syncEditorContent(node: HTMLDivElement, html: string) {
    const apply = (value: string) => {
      if (document.activeElement === node) return;
      if (node.innerHTML === value) return;
      node.innerHTML = value;
      refreshBlockPlaceholders(node);
    };

    apply(html);

    return {
      update(nextHtml: string) {
        apply(nextHtml);
      },
    };
  }

  function focusSection(key: string) {
    activeSectionKey = key;
    editorRefs.get(key)?.focus();
  }

  function closeSlashMenu() {
    slashMenu = {
      open: false,
      sectionKey: "",
      x: 0,
      y: 0,
      query: "",
      selectedIndex: 0,
    };
    slashMenuRange = null;
    slashMenuBlock = null;
  }

  function normalizeBlockText(block: HTMLElement | null) {
    return (block?.textContent || "").replace(/\u00a0/g, " ").trim();
  }

  function isBlockEmpty(block: HTMLElement | null) {
    return normalizeBlockText(block).length === 0;
  }

  function refreshBlockPlaceholders(editor: HTMLDivElement) {
    const blocks = editor.querySelectorAll<HTMLElement>("[data-placeholder]");
    for (const block of blocks) {
      block.classList.toggle("is-empty", isBlockEmpty(block));
    }
  }

  function findBlockElement(node: Node | null, editor: HTMLDivElement) {
    let current =
      node instanceof HTMLElement ? node : (node?.parentElement ?? null);
    while (current && current !== editor) {
      if (current.matches(BLOCK_SELECTOR)) return current;
      current = current.parentElement;
    }
    return null;
  }

  function getCurrentBlock(sectionKey: string) {
    const editor = editorRefs.get(sectionKey);
    if (!editor) return null;
    const selection = window.getSelection();
    if (!selection?.anchorNode || !editor.contains(selection.anchorNode))
      return null;
    return findBlockElement(selection.anchorNode, editor);
  }

  function restoreSlashSelection() {
    if (!slashMenuRange) return;
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(slashMenuRange);
  }

  function placeCaret(target: Node, atEnd = false) {
    const range = document.createRange();
    range.selectNodeContents(target);
    range.collapse(!atEnd ? true : false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  function createParagraphBlock(placeholder = "Escreva aqui...") {
    const paragraph = document.createElement("p");
    paragraph.dataset.placeholder = placeholder;
    paragraph.innerHTML = "<br>";
    return paragraph;
  }

  function createHeadingBlock(level = 1) {
    const heading = document.createElement(
      `h${Math.max(1, Math.min(6, level))}`,
    );
    heading.dataset.placeholder = "Titulo";
    heading.innerHTML = "<br>";
    return heading;
  }

  function createQuoteBlock() {
    const quote = document.createElement("blockquote");
    quote.dataset.placeholder = "Citação";
    quote.innerHTML = "<br>";
    return quote;
  }

  function createCodeBlock() {
    const pre = document.createElement("pre");
    const code = document.createElement("code");
    code.dataset.placeholder = "Escreva codigo";
    code.innerHTML = "<br>";
    pre.appendChild(code);
    return { block: pre, caretTarget: code };
  }

  function createListBlock(ordered: boolean, checklist = false) {
    const list = document.createElement(ordered ? "ol" : "ul");
    if (checklist) {
      list.dataset.listType = "checklist";
    }
    const item = document.createElement("li");
    item.dataset.placeholder = checklist
      ? "Tarefa"
      : ordered
        ? "Item numerado"
        : "Item";
    item.innerHTML = "<br>";
    list.appendChild(item);
    return { block: list, caretTarget: item };
  }

  function replaceBlock(
    oldBlock: HTMLElement,
    nextBlock: HTMLElement,
    caretTarget?: Node,
  ) {
    oldBlock.replaceWith(nextBlock);
    placeCaret(caretTarget || nextBlock);
  }

  function replaceBlockWithMarkup(
    oldBlock: HTMLElement,
    markup: string,
    focusSelector?: string,
  ) {
    const template = document.createElement("template");
    template.innerHTML = markup.trim();
    const focusTarget = focusSelector
      ? template.content.querySelector(focusSelector)
      : null;
    const fallbackTarget =
      template.content.lastElementChild || template.content.firstChild;
    oldBlock.replaceWith(template.content);
    if (focusTarget) {
      placeCaret(focusTarget, true);
    } else if (fallbackTarget) {
      placeCaret(fallbackTarget, true);
    }
  }

  function syncSectionFromDom(sectionKey: string) {
    const editor = editorRefs.get(sectionKey);
    const section = sections.find((item) => item.key === sectionKey);
    if (!editor || !section) return;
    refreshBlockPlaceholders(editor);
    section.contentHtml = sanitizeEditorHtml(editor.innerHTML);
    schedulePersist();
  }

  function openSlashMenu(sectionKey: string, block: HTMLElement, query = "") {
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const rect = block.getBoundingClientRect();
    const menuWidth = 220;
    const menuHeight = 360;
    const horizontalPadding = 12;
    const verticalPadding = 12;
    const clampedX = Math.min(
      Math.max(horizontalPadding, rect.left + 8),
      window.innerWidth - menuWidth - horizontalPadding,
    );
    const clampedY = Math.min(
      Math.max(verticalPadding, rect.bottom + 8),
      window.innerHeight - menuHeight - verticalPadding,
    );
    slashMenuRange = selection.getRangeAt(0).cloneRange();
    slashMenuBlock = block;
    slashMenu = {
      open: true,
      sectionKey,
      x: clampedX,
      y: clampedY,
      query,
      selectedIndex: 0,
    };
  }

  function getVisibleSlashCommands() {
    const query = slashMenu.query.trim().toLowerCase();
    if (!query) return slashCommands;

    return slashCommands.filter((command) => {
      const haystack =
        `${command.label} ${command.description} ${command.id} ${command.keywords.join(" ")}`.toLowerCase();
      return haystack.includes(query);
    });
  }

  function applySlashCommand(sectionKey: string, commandId: SlashCommandId) {
    const editor = editorRefs.get(sectionKey);
    const block = slashMenuBlock;
    if (!editor || !block) {
      closeSlashMenu();
      return;
    }

    restoreSlashSelection();
    let nextBlock: HTMLElement | null = null;
    let caretTarget: Node | undefined;

    switch (commandId) {
      case "heading":
        nextBlock = createHeadingBlock(1);
        break;
      case "bold":
        replaceBlockWithMarkup(
          block,
          '<p data-placeholder="Escreva aqui..."><strong>Texto</strong></p>',
          "strong",
        );
        break;
      case "italic":
        replaceBlockWithMarkup(
          block,
          '<p data-placeholder="Escreva aqui..."><em>Texto</em></p>',
          "em",
        );
        break;
      case "inline-code":
        replaceBlockWithMarkup(
          block,
          '<p data-placeholder="Escreva aqui..."><code>codigo</code></p>',
          "code",
        );
        break;
      case "code-block": {
        const code = createCodeBlock();
        nextBlock = code.block;
        caretTarget = code.caretTarget;
        break;
      }
      case "quote":
        nextBlock = createQuoteBlock();
        break;
      case "unordered-list": {
        const list = createListBlock(false);
        nextBlock = list.block;
        caretTarget = list.caretTarget;
        break;
      }
      case "ordered-list": {
        const list = createListBlock(true);
        nextBlock = list.block;
        caretTarget = list.caretTarget;
        break;
      }
      case "checklist": {
        const list = createListBlock(false, true);
        nextBlock = list.block;
        caretTarget = list.caretTarget;
        break;
      }
      case "link":
        replaceBlockWithMarkup(
          block,
          '<p data-placeholder="Escreva aqui..."><a href="https://" target="_blank" rel="noreferrer">link</a></p>',
          "a",
        );
        break;
      case "table":
        replaceBlockWithMarkup(
          block,
          "<table><thead><tr><th>Coluna</th><th>Valor</th></tr></thead><tbody><tr><td>Item</td><td>Texto</td></tr></tbody></table><p><br></p>",
          "td",
        );
        break;
      case "horizontal-rule":
        replaceBlockWithMarkup(block, "<hr><p><br></p>", "p");
        break;
    }

    if (nextBlock) {
      replaceBlock(block, nextBlock, caretTarget);
    }

    refreshBlockPlaceholders(editor);
    syncSectionFromDom(sectionKey);

    closeSlashMenu();
  }

  function convertMarkdownShortcut(sectionKey: string, block: HTMLElement) {
    const editor = editorRefs.get(sectionKey);
    if (!editor) return false;
    const rawText = (block.textContent || "").replace(/\u00a0/g, " ");

    if (block.tagName !== "P") return false;

    if (rawText === "# ") {
      replaceBlock(block, createHeadingBlock(1));
    } else if (rawText === "## ") {
      replaceBlock(block, createHeadingBlock(2));
    } else if (rawText === "### ") {
      replaceBlock(block, createHeadingBlock(3));
    } else if (rawText === "> ") {
      replaceBlock(block, createQuoteBlock());
    } else if (rawText === "- ") {
      const list = createListBlock(false);
      replaceBlock(block, list.block, list.caretTarget);
    } else if (rawText === "[ ] ") {
      const list = createListBlock(false, true);
      replaceBlock(block, list.block, list.caretTarget);
    } else if (rawText === "1. ") {
      const list = createListBlock(true);
      replaceBlock(block, list.block, list.caretTarget);
    } else {
      return false;
    }

    refreshBlockPlaceholders(editor);
    syncSectionFromDom(sectionKey);
    return true;
  }

  function isCaretAtStart(block: HTMLElement) {
    const selection = window.getSelection();
    if (!selection?.rangeCount || !selection.isCollapsed) return false;
    const range = selection.getRangeAt(0).cloneRange();
    const preRange = range.cloneRange();
    preRange.selectNodeContents(block);
    preRange.setEnd(range.startContainer, range.startOffset);
    return preRange.toString().length === 0;
  }

  function insertParagraphAfter(block: HTMLElement) {
    const paragraph = createParagraphBlock();
    block.after(paragraph);
    placeCaret(paragraph);
    return paragraph;
  }

  function liftBlockToParagraph(sectionKey: string, block: HTMLElement) {
    const editor = editorRefs.get(sectionKey);
    if (!editor) return;

    if (block.tagName === "LI") {
      const list = block.parentElement;
      const paragraph = createParagraphBlock();
      if (list && list.children.length === 1) {
        list.replaceWith(paragraph);
      } else if (list) {
        block.remove();
        list.after(paragraph);
      }
      placeCaret(paragraph);
    } else {
      const paragraph = createParagraphBlock();
      block.replaceWith(paragraph);
      placeCaret(paragraph);
    }

    refreshBlockPlaceholders(editor);
    syncSectionFromDom(sectionKey);
  }

  function isSectionCollapsed(key: string) {
    return !!collapsedSections[key];
  }

  function toggleSectionCollapse(key: string) {
    collapsedSections = {
      ...collapsedSections,
      [key]: !collapsedSections[key],
    };
    if (!collapsedSections[key]) {
      focusSection(key);
    }
  }

  function insertHtmlAtCaret(html: string) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    range.deleteContents();

    const fragment = range.createContextualFragment(html);
    const lastNode = fragment.lastChild;
    range.insertNode(fragment);

    if (lastNode) {
      range.setStartAfter(lastNode);
      range.setEndAfter(lastNode);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  function wrapSelectionWithTag(tagName: string) {
    const selection = window.getSelection();
    const selectedText = selection?.toString() || "";
    const text = selectedText || "Texto";
    insertHtmlAtCaret(`<${tagName}>${escapeHtml(text)}</${tagName}>`);
  }

  function applyToolbarAction(action: MarkdownToolbarAction) {
    const section =
      sections.find((item) => item.key === activeSectionKey) ||
      ensureTodaySection();
    if (!section) return;

    focusSection(section.key);
    const editor = editorRefs.get(section.key);
    if (!editor) return;

    switch (action) {
      case "heading":
        document.execCommand("formatBlock", false, "h3");
        break;
      case "bold":
        document.execCommand("bold");
        break;
      case "italic":
        document.execCommand("italic");
        break;
      case "inline-code":
        wrapSelectionWithTag("code");
        break;
      case "code-block":
        insertHtmlAtCaret("<pre><code>Bloco de codigo</code></pre><p><br></p>");
        break;
      case "quote":
        document.execCommand("formatBlock", false, "blockquote");
        break;
      case "unordered-list":
        document.execCommand("insertUnorderedList");
        break;
      case "ordered-list":
        document.execCommand("insertOrderedList");
        break;
      case "link": {
        const selected = window.getSelection()?.toString().trim() || "link";
        insertHtmlAtCaret(
          `<a href="https://" target="_blank" rel="noreferrer">${escapeHtml(selected)}</a>`,
        );
        break;
      }
      case "table":
        insertHtmlAtCaret(
          "<table><thead><tr><th>Coluna</th><th>Valor</th></tr></thead><tbody><tr><td>Item</td><td>Texto</td></tr></tbody></table><p><br></p>",
        );
        break;
      case "horizontal-rule":
        document.execCommand("insertHorizontalRule");
        break;
    }

    syncSectionFromDom(section.key);
  }

  function deleteDateSection(key: string) {
    sections = sections.filter((item) => item.key !== key);
    if (activeSectionKey === key) {
      activeSectionKey = sections[0]?.key || "";
    }

    if (!sections.some((item) => item.key === todayKey)) {
      localStorage.removeItem(LAST_DATE_KEY);
    }

    if (sections.length === 0) {
      ensureTodaySection();
    }

    schedulePersist();
  }

  function handleEditorInput(sectionKey: string, event: Event) {
    const element = event.currentTarget as HTMLDivElement;
    refreshBlockPlaceholders(element);
    const currentBlock = getCurrentBlock(sectionKey);
    if (currentBlock && convertMarkdownShortcut(sectionKey, currentBlock)) {
      closeSlashMenu();
      return;
    }

    const currentText = (currentBlock?.textContent || "").replace(
      /\u00a0/g,
      " ",
    );
    if (currentBlock?.tagName === "P" && currentText.startsWith("/")) {
      openSlashMenu(sectionKey, currentBlock, currentText.slice(1));
    } else if (slashMenu.open && slashMenu.sectionKey === sectionKey) {
      closeSlashMenu();
    }

    const nextHtml = sanitizeEditorHtml(element.innerHTML);
    const section = sections.find((item) => item.key === sectionKey);
    if (!section) return;
    section.contentHtml = nextHtml;
    activeSectionKey = sectionKey;
    schedulePersist();
  }

  function handleEditorKeydown(sectionKey: string, event: KeyboardEvent) {
    const editor = event.currentTarget as HTMLDivElement;
    const block = getCurrentBlock(sectionKey);

    const visibleSlashCommands = getVisibleSlashCommands();

    if (slashMenu.open && slashMenu.sectionKey === sectionKey) {
      if (visibleSlashCommands.length === 0) {
        if (event.key === "Escape") {
          event.preventDefault();
          closeSlashMenu();
        }
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        slashMenu.selectedIndex =
          (slashMenu.selectedIndex + 1) % visibleSlashCommands.length;
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        slashMenu.selectedIndex =
          (slashMenu.selectedIndex - 1 + visibleSlashCommands.length) %
          visibleSlashCommands.length;
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const command = visibleSlashCommands[slashMenu.selectedIndex];
        if (command) applySlashCommand(sectionKey, command.id);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        closeSlashMenu();
        return;
      }
    }

    if (
      event.key === "Backspace" &&
      block &&
      isBlockEmpty(block) &&
      isCaretAtStart(block)
    ) {
      const tagName = block.tagName;
      const list = block.parentElement;
      const isChecklistItem =
        tagName === "LI" && list?.dataset.listType === "checklist";
      if (
        tagName === "LI" ||
        isChecklistItem ||
        /^H[1-6]$/.test(tagName) ||
        tagName === "BLOCKQUOTE" ||
        tagName === "PRE"
      ) {
        event.preventDefault();
        liftBlockToParagraph(sectionKey, block);
        return;
      }
    }

    if (event.key !== "Enter" || event.shiftKey || !block) return;

    const tagName = block.tagName;
    if (
      isBlockEmpty(block) &&
      (tagName === "LI" ||
        /^H[1-6]$/.test(tagName) ||
        tagName === "BLOCKQUOTE" ||
        tagName === "PRE")
    ) {
      event.preventDefault();
      liftBlockToParagraph(sectionKey, block);
      return;
    }

    if (
      !isBlockEmpty(block) &&
      (/^H[1-6]$/.test(tagName) || tagName === "BLOCKQUOTE")
    ) {
      event.preventDefault();
      const paragraph = insertParagraphAfter(block);
      refreshBlockPlaceholders(editor);
      syncSectionFromDom(sectionKey);
      placeCaret(paragraph);
      return;
    }

    if (sectionKey !== todayKey) return;
    const isEditorEmpty = !editor.textContent?.trim();
    if (!isEditorEmpty) return;
    event.preventDefault();
    document.execCommand("insertParagraph");
  }

  function handleEditorFocus(sectionKey: string) {
    activeSectionKey = sectionKey;
    closeSlashMenu();
  }

  function handleEditorBlur(sectionKey: string, event: FocusEvent) {
    const element = event.currentTarget as HTMLDivElement;
    if (!element.textContent?.trim()) {
      element.innerHTML = "<p><br></p>";
    }
    refreshBlockPlaceholders(element);
    const section = sections.find((item) => item.key === sectionKey);
    if (section) {
      section.contentHtml = sanitizeEditorHtml(element.innerHTML);
      schedulePersist();
    }
  }

  onMount(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest(".zen-slash-menu")) return;
      closeSlashMenu();
    };

    window.addEventListener("pointerdown", handlePointerDown);

    const stored = localStorage.getItem(CONTENT_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ZenSection[];
        sections = parsed.map((section) => ({
          ...section,
          contentHtml: sanitizeEditorHtml(section.contentHtml || ""),
        }));
      } catch (error) {
        console.error("Falha ao carregar notas Zen em formato novo", error);
      }
    }

    if (sections.length === 0) {
      const legacy = localStorage.getItem(LEGACY_CONTENT_KEY);
      if (legacy) {
        sections = convertLegacyMarkdownToSections(legacy);
        schedulePersist();
      }
    }

    ensureTodaySection();
    activeSectionKey = todayKey;

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  });

  onDestroy(() => {
    if (persistTimer) clearTimeout(persistTimer);
    persist();
  });
</script>

<div class="zen-notes" bind:this={searchTarget}>
  <div class="zen-surface">
    {#each sections as section (section.key)}
      <section
        class="zen-day"
        class:collapsed={isSectionCollapsed(section.key)}
      >
        <div class="zen-day-card">
          <div class="zen-day-header-row">
            <button
              type="button"
              class="zen-collapse-toggle"
              aria-expanded={!isSectionCollapsed(section.key)}
              aria-label={isSectionCollapsed(section.key)
                ? "Discolapsar data"
                : "Collapsar data"}
              title={isSectionCollapsed(section.key)
                ? "Discolapsar data"
                : "Collapsar data"}
              onclick={() => toggleSectionCollapse(section.key)}
            >
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                stroke-width="2.25"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
                style="transform: {isSectionCollapsed(section.key)
                  ? 'rotate(-90deg)'
                  : 'rotate(0deg)'}; transition: transform 120ms ease;"
              >
                <path d="M9 18l6-6-6-6"></path>
              </svg>
            </button>
            <h2
              class="zen-date-heading"
              style="font-family: {settings.previewFont}, sans-serif;"
            >
              <span>{section.label}</span>
            </h2>
            <button
              type="button"
              class="zen-date-delete"
              data-zen-date={section.key}
              aria-label="Excluir dia"
              title="Excluir dia"
              onclick={() => deleteDateSection(section.key)}
            >
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M3 6h18"></path>
                <path d="M8 6V4h8v2"></path>
                <path d="M19 6l-1 14H6L5 6"></path>
                <path d="M10 11v5"></path>
                <path d="M14 11v5"></path>
              </svg>
            </button>
          </div>
          <div class="zen-divider" aria-hidden="true"></div>
          {#if !isSectionCollapsed(section.key)}
            <div
              use:editorRef={section.key}
              use:syncEditorContent={section.contentHtml}
              class="markdown-body zen-editor"
              class:is-active={section.key === activeSectionKey}
              contenteditable="true"
              role="textbox"
              aria-multiline="true"
              tabindex="0"
              style="font-family: {settings.previewFont}, sans-serif; font-size: {settings.previewFontSize}px;"
              data-placeholder="Escreva aqui..."
              onfocus={() => handleEditorFocus(section.key)}
              onblur={(event) => handleEditorBlur(section.key, event)}
              oninput={(event) => handleEditorInput(section.key, event)}
              onkeydown={(event) => handleEditorKeydown(section.key, event)}
            ></div>
          {/if}
        </div>
      </section>
    {/each}
  </div>

  {#if slashMenu.open}
    <div
      class="zen-slash-menu"
      style="left: {slashMenu.x}px; top: {slashMenu.y}px;"
    >
      {#each getVisibleSlashCommands() as command, index}
        <button
          type="button"
          class="zen-slash-item"
          class:is-selected={index === slashMenu.selectedIndex}
          onmousedown={(event) => event.preventDefault()}
          onclick={() => applySlashCommand(slashMenu.sectionKey, command.id)}
        >
          <span class="zen-slash-icon" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              {#if command.icon === "heading"}
                <path d="M5 5v14M19 5v14M5 12h14"></path>
                <path d="M15.5 5h3.5" opacity="0.55"></path>
              {:else if command.icon === "bold"}
                <path d="M7 4h7a4 4 0 0 1 0 8H7z"></path>
                <path d="M7 12h8a4 4 0 0 1 0 8H7z"></path>
              {:else if command.icon === "italic"}
                <path d="M14 4h5M5 20h5M15 4 9 20"></path>
              {:else if command.icon === "inline-code"}
                <path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"></path>
              {:else if command.icon === "code-block"}
                <path d="M4 5h5M4 5v14M4 19h5M20 5h-5M20 5v14M20 19h-5"></path>
                <path d="m10 9-3 3 3 3M14 9l3 3-3 3"></path>
              {:else if command.icon === "quote"}
                <path d="M7 17h4V9H5v5h3c0 2-1 3-3 4"></path>
                <path d="M17 17h4V9h-6v5h3c0 2-1 3-3 4"></path>
              {:else if command.icon === "unordered-list"}
                <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none"
                ></circle>
                <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none"
                ></circle>
                <circle cx="4" cy="18" r="1" fill="currentColor" stroke="none"
                ></circle>
                <path d="M9 6h11M9 12h11M9 18h11"></path>
              {:else if command.icon === "ordered-list"}
                <path d="M3 5h1v3M3 8h2M3 12h2l-2 3h2M3 18h2v3H3"></path>
                <path d="M9 6h11M9 13h11M9 20h11"></path>
              {:else if command.icon === "link"}
                <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2"
                ></path>
                <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.2"
                ></path>
              {:else if command.icon === "table"}
                <rect x="3" y="4" width="18" height="16" rx="1"></rect>
                <path d="M3 10h18M3 15h18M9 4v16M15 4v16"></path>
              {:else if command.icon === "horizontal-rule"}
                <path d="M4 12h16"></path>
                <path d="m7 9-3 3 3 3M17 9l3 3-3 3" opacity="0.65"></path>
              {:else if command.icon === "checklist"}
                <rect x="4" y="5" width="3" height="3" rx="0.5"></rect>
                <rect x="4" y="10.5" width="3" height="3" rx="0.5"></rect>
                <rect x="4" y="16" width="3" height="3" rx="0.5"></rect>
                <path d="M10 6.5h10M10 12h10M10 17.5h10"></path>
              {/if}
            </svg>
          </span>
          <span class="zen-slash-text">
            <span class="zen-slash-label">/{command.label.toLowerCase()}</span>
            <span class="zen-slash-description">{command.description}</span>
          </span>
        </button>
      {/each}
    </div>
  {/if}

  {#if settings.showMarkdownToolbar}
    <MarkdownToolbar onaction={applyToolbarAction} />
  {/if}
</div>

<style>
  .zen-notes {
    position: relative;
    flex: 1;
    min-width: 0;
    display: flex;
    justify-content: center;
    overflow: auto;
    background: var(--color-canvas-default);
  }

  .zen-surface {
    width: min(920px, calc(100% - 48px));
    min-height: 100%;
    padding: 24px 0 120px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .zen-day {
    display: flex;
    flex-direction: column;
    gap: 0;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
  }

  .zen-day-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .zen-day-header-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .zen-collapse-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--color-fg-muted);
    cursor: pointer;
    flex: 0 0 auto;
  }

  .zen-collapse-toggle:hover {
    color: var(--color-fg-default);
    background: var(--color-canvas-subtle);
  }

  .zen-date-heading {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 10px;
    margin: 0;
    text-transform: capitalize;
    font-size: 0.98rem;
    font-weight: 700;
  }

  .zen-divider {
    height: 1px;
    width: 100%;
    margin: 2px 0 8px;
    background: var(--color-border-muted);
    opacity: 0.8;
  }

  .zen-day.collapsed .zen-divider {
    margin-bottom: 4px;
  }

  .zen-editor {
    max-width: none;
    min-height: 160px;
    padding: 2px 0 0;
    border: 0;
    border-radius: 0;
    color: var(--color-fg-default);
    line-height: 1.6;
    outline: none;
    background: transparent;
    box-shadow: none;
    margin-top: 2px;
  }

  .zen-editor:hover,
  .zen-editor:focus,
  .zen-editor.is-active {
    border: 0;
    background: transparent;
  }

  .zen-editor:empty::before {
    content: attr(data-placeholder);
    color: var(--color-fg-muted);
    pointer-events: none;
  }

  :global(.zen-editor [data-placeholder].is-empty::before) {
    content: attr(data-placeholder);
    color: var(--color-fg-muted);
    pointer-events: none;
  }

  :global(.zen-editor ul[data-list-type="checklist"]) {
    list-style: none;
    padding-left: 0;
  }

  :global(.zen-editor ul[data-list-type="checklist"] li) {
    position: relative;
    padding-left: 1.5rem;
  }

  :global(.zen-editor ul[data-list-type="checklist"] li::before) {
    content: "";
    position: absolute;
    left: 0;
    top: 0.38rem;
    width: 0.85rem;
    height: 0.85rem;
    border: 1px solid var(--color-border-muted);
    border-radius: 0.25rem;
    background: transparent;
  }

  .zen-date-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin: 0;
  }

  .zen-date-delete {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: 1px solid var(--color-border-muted);
    border-radius: 6px;
    background: var(--color-canvas-subtle);
    color: var(--color-fg-muted);
    cursor: pointer;
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition:
      opacity 120ms ease,
      visibility 120ms ease,
      color 120ms ease,
      border-color 120ms ease,
      background-color 120ms ease;
  }

  .zen-day:hover .zen-date-delete,
  .zen-date-delete:focus-visible {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }

  .zen-date-delete:hover {
    color: var(--color-danger-fg, #f85149);
    border-color: color-mix(
      in srgb,
      var(--color-danger-fg, #f85149) 48%,
      transparent
    );
    background: color-mix(
      in srgb,
      var(--color-danger-fg, #f85149) 12%,
      transparent
    );
  }

  .zen-slash-menu {
    position: fixed;
    z-index: 40;
    display: flex;
    flex-direction: column;
    min-width: 260px;
    max-height: min(360px, calc(100vh - 24px));
    padding: 6px;
    overflow-y: auto;
    border: 1px solid var(--color-border-default);
    border-radius: 10px;
    background: var(--color-canvas-overlay, var(--color-canvas-default));
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
  }

  .zen-slash-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--color-fg-default);
    text-align: left;
    cursor: pointer;
  }

  .zen-slash-item:hover,
  .zen-slash-item.is-selected {
    background: var(--color-canvas-subtle);
  }

  .zen-slash-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    flex: 0 0 auto;
    border-radius: 8px;
    background: color-mix(in srgb, var(--color-canvas-subtle) 82%, transparent);
    color: var(--color-fg-default);
  }

  .zen-slash-text {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    min-width: 0;
  }

  .zen-slash-label {
    font-size: 0.92rem;
    font-weight: 600;
  }

  .zen-slash-description {
    font-size: 0.78rem;
    color: var(--color-fg-muted);
  }
</style>
