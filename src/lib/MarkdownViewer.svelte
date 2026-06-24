<script lang="ts">
  import { convertFileSrc } from "@tauri-apps/api/core";
  import { listen } from "@tauri-apps/api/event";
  import { LogicalSize } from "@tauri-apps/api/dpi";
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import { onMount, tick, untrack } from "svelte";
  import { fly } from "svelte/transition";
  import { cubicOut } from "svelte/easing";
  import { openUrl } from "@tauri-apps/plugin-opener";
  import { open, save } from "@tauri-apps/plugin-dialog";
  import Installer from "./Installer.svelte";
  import Uninstaller from "./Uninstaller.svelte";
  import Settings from "./components/Settings.svelte";
  import TitleBar from "./components/TitleBar.svelte";
  import Editor from "./components/Editor.svelte";
  import Modal from "./components/Modal.svelte";
  import ContextMenu, {
    type ContextMenuItem,
  } from "./components/ContextMenu.svelte";
  import Toc from "./components/Toc.svelte";
  import Toast from "./components/Toast.svelte";
  import FindBar from "./components/FindBar.svelte";
  import { exportAsHtml as _exportHtml, exportAsPdf } from "./utils/export";
  import ZoomOverlay from "./components/ZoomOverlay.svelte";
  import CommandPalette, {
    type CommandPaletteItem,
  } from "./components/CommandPalette.svelte";
  import RecoveryDialog from "./components/RecoveryDialog.svelte";
  import ExternalConflictDialog from "./components/ExternalConflictDialog.svelte";
  import ExportPreviewModal from "./components/ExportPreviewModal.svelte";
  import ZenNotes from "./components/ZenNotes.svelte";
  import { tauriCommands } from "./api/tauri.js";
  import {
    processMarkdownHtml,
    highlightColorMap,
    renderRichContent as _renderRichContent,
  } from "./features/preview/markdown.processor.js";
  import {
    getLanguage,
    isMarkdownPath,
    isPlainTextPath,
    MARKDOWN_EXTENSIONS,
  } from "./features/files/file-types.js";
  import { recoveryStore } from "./services/recovery.js";
  import type {
    DocumentSnapshot,
    SaveStatus,
  } from "./services/document-session.js";
  import { closeTabsSafely } from "./services/tab-close.js";
  import { inspectExternalFileChange } from "./services/external-file-change.js";
  import { createFileWatcherSync } from "./services/file-watcher.js";
  import { createRecentFilesStore } from "./services/recent-files.js";
  import { loadDocument } from "./services/document-load.js";
  import { persistDocument } from "./services/document-persist.js";
  import {
    clearWindowSession,
    flushDirtyFileTabs,
    persistWindowSession,
    restoreWindowSession,
    saveTabsSequentially,
  } from "./services/window-lifecycle.js";
  import {
    decodeMarkdownLink,
    getRelativeMarkdownTarget,
    isAbsoluteMarkdownPath,
    normalizeComparableMarkdownPath,
    resolveMarkdownTarget,
    type RelativeMarkdownTarget,
  } from "./features/preview/markdown-navigation.js";
  import {
    DOCUMENT_TEMPLATES,
    type DocumentTemplate,
  } from "./utils/templates.js";

  let appWindow: any = null;
  try {
    appWindow = getCurrentWindow();
  } catch (err) {
    appWindow = null;
  }

  import DOMPurify from "dompurify";
  import HomePage from "./components/HomePage.svelte";
  import { tabManager, type NewFileType } from "./stores/tabs.svelte.js";
  import { settings } from "./stores/settings.svelte.js";
  import { t } from "./utils/i18n.js";

  // syntax highlighting & latex
  let hljs: any = $state(null);
  let katex: any = $state(null);
  let renderMathInElement: any = $state(null);
  let mermaid: any = $state(null);

  import "highlight.js/styles/github-dark.css";
  import "katex/dist/katex.min.css";

  let mode = $state<"loading" | "app" | "installer" | "uninstall">("loading");

  let showSettings = $state(false);
  let showCommandPalette = $state(false);
  let showRecovery = $state(false);
  let recoverySnapshots = $state<DocumentSnapshot[]>([]);
  let recoverySaveWarningShown = false;
  let externalConflict = $state<{ path: string; content: string } | null>(null);
  let saveStatus = $state<SaveStatus>("idle");

  let uiLanguage = $state(settings.language);

  $effect(() => {
    uiLanguage = settings.language;
  });

  let recentFiles = $state<string[]>([]);
  const recentFilesStore = createRecentFilesStore(localStorage);
  let commandPaletteItems = $derived.by<CommandPaletteItem[]>(() => [
    {
      id: "new-markdown",
      label: "New Markdown document",
      keywords: "create note",
      run: () => handleNewFile("markdown"),
    },
    {
      id: "new-text",
      label: "New text document",
      keywords: "create plain text",
      run: () => handleNewFile("text"),
    },
    ...DOCUMENT_TEMPLATES.map((template) => ({
      id: `template:${template.id}`,
      label: `New from template: ${template.name}`,
      keywords: "template writing",
      run: () => createFromTemplate(template),
    })),
    {
      id: "open-file",
      label: t("home.openFile", settings.language),
      keywords: "browse select",
      run: selectFile,
    },
    {
      id: "save",
      label: t("settings.save", settings.language),
      detail: "Ctrl/Cmd+S",
      run: () => saveContent(),
    },
    {
      id: "find",
      label: "Find in document",
      detail: "Ctrl/Cmd+F",
      keywords: "search find preview",
      run: () => triggerFindAction(),
    },
    {
      id: "preview-export",
      label: "Preview export",
      detail: "Ctrl/Cmd+Shift+E",
      keywords: "export html pdf preview",
      run: () => openExportPreview(),
    },
    {
      id: "settings",
      label: t("settings.title", settings.language),
      run: () => (showSettings = true),
    },
    {
      id: "home",
      label: t("menu.home", settings.language),
      run: () => (showHome = true),
    },
    ...recentFiles.slice(0, 10).map((path) => ({
      id: `recent:${path}`,
      label: path.split(/[/\\]/).pop() || path,
      detail: path,
      keywords: "recent file",
      run: () => loadMarkdown(path),
    })),
  ]);
  let isFocused = $state(true);

  let containerEl: HTMLElement;
  let markdownBody: HTMLElement | null = $state(null);
  let zenSearchTarget: HTMLElement | null = $state(null);
  const renderDebounceMs = 50;
  let renderTimeout: ReturnType<typeof setTimeout> | null = null;

  let editorPane = $state<{
    syncScrollToLine: (line: number, ratio?: number) => void;
    handleDroppedFile: (path: string, x: number, y: number) => Promise<void>;
    updateDragCaret: (x: number, y: number) => void;
    hideDragCaret: () => void;
    undo: () => void;
    redo: () => void;
    revealHeader: (text: string) => void;
    triggerFind: () => void;
  } | null>(null);
  let liveMode = $state(false);
  const fileWatcher = createFileWatcherSync({
    watch: tauriCommands.watchFile,
    unwatch: tauriCommands.unwatchFile,
  });

  $effect(() => {
    const paths = tabManager.tabs
      .map((tab) => tab.path)
      .filter((path) => path && path !== "HOME");
    const enabled = liveMode;
    untrack(() => {
      void fileWatcher.sync(enabled ? paths : []).catch(console.error);
    });
  });

  let findOpen = $state(false);
  let findBar = $state<{
    reapply: () => void;
    clearHighlights: () => void;
  } | null>(null);
  let isZenCompactMode = $state(false);

  // Decide where Cmd/Ctrl+F should land based on what's visible and where
  // focus is. Used by both the JS keydown handler (Win/Linux + macOS in-page
  // shortcut) and the macOS native menu listener (which fires Cmd+F via the
  // Edit menu accelerator and bypasses the JS keydown path).
  function triggerFindAction() {
    if (showZenMode) {
      findOpen = !findOpen;
      return;
    }
    const active = document.activeElement as Node | null;
    const editorHasFocus =
      !!editorPaneEl && !!active && editorPaneEl.contains(active);
    const previewVisible = !isEditing || !!tabManager.activeTab?.isSplit;
    if (findOpen) {
      findOpen = false;
      return;
    }
    if (editorHasFocus || !previewVisible) {
      editorPane?.triggerFind?.();
    } else if (markdownBody) {
      findOpen = true;
    }
  }

  $effect(() => {
    tabManager.activeTabId;
    findOpen = false;
  });

  onMount(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      if (!findOpen) return;
      const target = event.target as Element | null;
      if (
        target?.closest(".find-bar") ||
        target?.closest('[data-find-toggle="true"]')
      )
        return;
      findOpen = false;
    };

    window.addEventListener("click", handleGlobalClick, true);
    return () => window.removeEventListener("click", handleGlobalClick, true);
  });

  let isDragging = $state(false);
  let dragTarget = $state<"editor" | "preview" | null>(null);
  let editorPaneEl = $state<HTMLElement>();
  let viewerPaneEl = $state<HTMLElement>();
  let isProgrammaticScroll = false;

  let toasts = $state<
    { id: string; message: string; type: "info" | "error" | "warning" }[]
  >([]);
  function addToast(
    message: string,
    type: "info" | "error" | "warning" = "info",
  ) {
    const id = crypto.randomUUID();
    toasts.push({ id, message, type });
  }

  // --- Auto-save bookkeeping (see saveContent + auto-save $effect below) ---
  // Per-tab debounce timers so switching tabs cannot kill another tab's pending save.
  const autoSaveTimers = new Map<string, ReturnType<typeof setTimeout>>();
  // Per-tab last-seen rawContent value, used by the auto-save effect to
  // detect which tab actually changed in this run. JS string `===` is a
  // value compare, so any edit yields a different value — including
  // same-length ones (overwriting characters, formatting toggles) that
  // a length-based tick would miss.
  const lastContentRefByTab = new Map<string, string>();
  // Suppress the file-watcher reload that fires when we ourselves write the file.
  // Maps absolute path -> wall-clock ms after which an event for that path is real again.
  const selfWriteUntilByPath = new Map<string, number>();
  const SELF_WRITE_GRACE_MS = 400;
  const AUTO_SAVE_DEBOUNCE_MS = 1500;

  function markSelfWrite(path: string) {
    selfWriteUntilByPath.set(path, Date.now() + SELF_WRITE_GRACE_MS);
  }

  function clearSelfWrite(path: string) {
    selfWriteUntilByPath.delete(path);
  }

  // Cancel a pending auto-save for a tab. Call this only on paths that
  // COMMIT to a save or discard outcome — never before showing a modal,
  // because if the user picks Cancel, the timer is gone forever and
  // background auto-save is silently disabled for that tab until the
  // next keystroke.
  function cancelPendingAutoSave(tabId: string) {
    const t = autoSaveTimers.get(tabId);
    if (t) {
      clearTimeout(t);
      autoSaveTimers.delete(tabId);
    }
  }

  // in-page scroll position history for mouse 4/5 nav
  let scrollHistory: number[] = [];
  let scrollFuture: number[] = [];
  let collapsedHeaders = $state(new Set<string>());
  let zoomData = $state<{ src?: string; html?: string } | null>(null);

  // derived from tab manager
  let activeTab = $derived(tabManager.activeTab);
  let isEditing = $derived(activeTab?.isEditing ?? false);
  let rawContent = $derived(activeTab?.rawContent ?? "");
  let isSplit = $derived(activeTab?.isSplit ?? false);

  // derived from tab manager
  let currentFile = $derived(tabManager.activeTab?.path ?? "");
  let newFileType = $derived(activeTab?.newFileType ?? "markdown");
  let isMarkdown = $derived(
    currentFile === ""
      ? newFileType === "markdown"
      : isMarkdownPath(currentFile),
  );
  let isPlainText = $derived(
    currentFile === "" ? newFileType === "text" : isPlainTextPath(currentFile),
  );
  let editorLanguage = $derived(
    currentFile === ""
      ? newFileType === "json"
        ? "json"
        : newFileType === "text"
          ? "plaintext"
          : "markdown"
      : getLanguage(currentFile),
  );
  let htmlContent = $derived(tabManager.activeTab?.content ?? "");
  const markdownLinkExtensionPattern = MARKDOWN_EXTENSIONS.map((ext) =>
    ext.slice(1).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  ).join("|");
  const allowedMarkdownUriPattern = new RegExp(
    `^(?:(?:[a-z]:[^?#]*\\.(?:${markdownLinkExtensionPattern})(?:[?#].*)?$)|(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|asset|tauri):|[^a-z]|[a-z+.\\-]+(?:[^a-z+.\\-:]|$))`,
    "i",
  );
  let sanitizedHtml = $derived(
    DOMPurify.sanitize(htmlContent, {
      ALLOWED_URI_REGEXP: allowedMarkdownUriPattern,
    }),
  );
  let scrollTop = $derived(tabManager.activeTab?.scrollTop ?? 0);
  let isScrolled = $derived(scrollTop > 0);
  let windowTitle = $derived(tabManager.activeTab?.title ?? "Draftly");
  let isScrollSynced = $derived(tabManager.activeTab?.isScrollSynced ?? false);

  let loadingTabs = $state<string[]>([]);
  let isAtBottom = $state(false);

  let showHome = $state(false);
  let showZenMode = $state(false);
  let showExportPreview = $state(false);
  let exportPreviewContent = $state("");
  let exportPreviewTitle = $state("");
  let exportPreviewPath = $state("");
  localStorage.removeItem("isFullWidth");

  const openExportPreview = () => {
    const tab = tabManager.activeTab;
    if (!tab) return;
    exportPreviewContent = sanitizedHtml;
    exportPreviewTitle = tab.title || "";
    exportPreviewPath = tab.path || "";
    showExportPreview = true;
  };

  $effect(() => {
    const tab = tabManager.activeTab;
    if (tab && isMarkdown && !tab.isSplit) {
      tab.splitRatio = 0.6;
      tabManager.setSplitEnabled(tab.id, true);
    }
  });

  import { parseAndApplyVscodeTheme, clearVscodeTheme } from "./utils/theme";

  // Theme State
  let theme = $state<string>("dark");

  onMount(() => {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme === "light" || storedTheme === "dark") {
      theme = storedTheme;
    } else {
      theme = "dark";
    }
    // Clear the forced background color from app.html
    document.documentElement.style.removeProperty("background-color");
  });

  $effect(() => {
    localStorage.setItem("theme", theme);
    tauriCommands.saveTheme(theme).catch(console.error);

    if (theme === "light" || theme === "dark") {
      document.documentElement.dataset.theme = theme;
      document.documentElement.dataset.themeType = theme;
      clearVscodeTheme();
      const monaco = (window as any).monaco;
      if (monaco && monaco.editor) {
        monaco.editor.setTheme(theme === "dark" ? "vs-dark" : "vs");
      }
    }

    // Re-initialize mermaid or trigger update if needed
    // Note: Mermaid 10+ usually doesn't support dynamic re-init easily but we can try re-rendering rich content
    if (markdownBody && !isEditing) renderRichContent();
  });

  // ui state
  let tooltip = $state({
    show: false,
    text: "",
    shortcut: "",
    html: "",
    isFootnote: false,
    x: 0,
    y: 0,
    align: "top" as "top" | "right" | "left" | "below",
  });
  let caretEl: HTMLElement;
  let caretAbsoluteTop = 0;
  let modalState = $state<{
    show: boolean;
    title: string;
    message: string;
    kind: "info" | "warning" | "error";
    showSave: boolean;
    resolve: ((v: "save" | "discard" | "cancel") => void) | null;
  }>({
    show: false,
    title: "",
    message: "",
    kind: "info",
    showSave: false,
    resolve: null,
  });

  let docContextMenu = $state<{
    show: boolean;
    x: number;
    y: number;
    items: ContextMenuItem[];
  }>({
    show: false,
    x: 0,
    y: 0,
    items: [],
  });

  function askCustom(
    message: string,
    options: {
      title: string;
      kind: "info" | "warning" | "error";
      showSave?: boolean;
    },
  ): Promise<"save" | "discard" | "cancel"> {
    return new Promise((resolve) => {
      modalState = {
        show: true,
        title: options.title,
        message,
        kind: options.kind,
        showSave: options.showSave ?? false,
        resolve,
      };
    });
  }

  function handleModalSave() {
    if (modalState.resolve) modalState.resolve("save");
    modalState.show = false;
  }

  function handleModalConfirm() {
    if (modalState.resolve) modalState.resolve("discard");
    modalState.show = false;
  }

  function handleModalCancel() {
    if (modalState.resolve) modalState.resolve("cancel");
    modalState.show = false;
  }

  function handleSplitterKeyDown(e: KeyboardEvent) {
    const activeTab = tabManager.activeTab;
    if (!activeTab || !tabManager.activeTabId) return;

    if (e.key === "ArrowLeft") {
      tabManager.setSplitRatio(
        tabManager.activeTabId,
        Math.max(0.1, activeTab.splitRatio - 0.05),
      );
    } else if (e.key === "ArrowRight") {
      tabManager.setSplitRatio(
        tabManager.activeTabId,
        Math.min(0.9, activeTab.splitRatio + 0.05),
      );
    }
  }

  let isForceExiting = $state(false);

  async function appExit() {
    if (settings.restoreStateOnReopen) {
      const hasUnsaved = tabManager.tabs.some(
        (t) => t.isDirty || (t.path === "" && t.rawContent.trim() !== ""),
      );
      if (hasUnsaved) {
        const response = await askCustom(
          t("modal.areYouSureYouWantToExit", settings.language),
          {
            title: t("modal.confirmExit", settings.language),
            kind: "warning",
            showSave: false,
          },
        );
        if (response !== "discard") return;
      }
      clearWindowSession(localStorage);
      isForceExiting = true;
    }
    await appWindow?.close?.();
  }

  $effect(() => {
    const _ = tabManager.activeTabId;
    showHome = false;
    findOpen = false;
  });

  type LoadMarkdownOptions = {
    navigate?: boolean;
    skipTabManagement?: boolean;
    preserveEditState?: boolean;
    resetScrollHistory?: boolean;
  };

  async function loadMarkdown(
    filePath: string,
    options: LoadMarkdownOptions = {},
  ) {
    showHome = false;
    let existing = null;
    try {
      if (options.resetScrollHistory || filePath !== currentFile) {
        scrollHistory = [];
        scrollFuture = [];
      }
      if (options.navigate && tabManager.activeTab) {
        tabManager.navigate(tabManager.activeTab.id, filePath);
      } else if (!options.skipTabManagement) {
        existing = tabManager.tabs.find((t) => t.path === filePath);
        if (existing) {
          tabManager.setActive(existing.id);
        } else if (
          tabManager.activeTab &&
          tabManager.activeTab.path === "" &&
          !tabManager.activeTab.isDirty &&
          tabManager.activeTab.rawContent.trim() === ""
        ) {
          tabManager.updateTabPath(tabManager.activeTab.id, filePath);
        } else {
          tabManager.addTab(filePath);
        }
      }
      const activeId = tabManager.activeTabId;
      if (!activeId) return;

      const tab = tabManager.tabs.find((t) => t.id === activeId);
      const loaded = await loadDocument(filePath, tauriCommands);

      if (loaded.kind === "markdown") {
        if (tab && !tab.isSplit) {
          tab.splitRatio = 0.6;
          tabManager.setSplitEnabled(tab.id, true);
        }
        const processedInfo = processMarkdownHtml(
          loaded.initial.html,
          filePath,
          collapsedHeaders,
        );
        tabManager.updateTabContent(activeId, processedInfo);
        tabManager.setTabRawContent(activeId, loaded.initial.content);

        if (loaded.full) {
          loadingTabs = [...loadingTabs, activeId];
          tick().then(() => {
            if (markdownBody)
              isAtBottom =
                markdownBody.scrollHeight <= markdownBody.clientHeight + 100;
          });
          loaded.full
            .then(({ html, content }) => {
              const applyFull = () => {
                try {
                  if (isScrolling) {
                    setTimeout(applyFull, 100);
                    return;
                  }
                  if (
                    tabManager.tabs.find((t) => t.id === activeId)?.path ===
                    filePath
                  ) {
                    const fullProcessed = processMarkdownHtml(
                      html,
                      filePath,
                      collapsedHeaders,
                    );
                    tabManager.updateTabContent(activeId, fullProcessed);
                    tabManager.setTabRawContent(activeId, content);
                    loadingTabs = loadingTabs.filter((id) => id !== activeId);
                    if (tabManager.activeTabId === activeId) {
                      tick().then(() => {
                        setTimeout(renderRichContent, 10);
                      });
                    }
                  } else {
                    loadingTabs = loadingTabs.filter((id) => id !== activeId);
                  }
                } catch (applyErr) {
                  console.error("applyFull error:", applyErr);
                  addToast(
                    "Error processing full markdown: " + String(applyErr),
                    "error",
                  );
                  loadingTabs = loadingTabs.filter((id) => id !== activeId);
                }
              };

              if ("requestIdleCallback" in window) {
                (window as any).requestIdleCallback(applyFull, {
                  timeout: 2000,
                });
              } else {
                setTimeout(applyFull, 100);
              }
            })
            .catch((e) => {
              console.error("Promise.all error:", e);
              addToast(
                "Backend Error loading full markdown: " + String(e),
                "error",
              );
              loadingTabs = loadingTabs.filter((id) => id !== activeId);
            });
        }
      } else {
        if (tab) {
          tabManager.setSplitEnabled(tab.id, false);
          tab.isEditing = true;
        }
        tabManager.setTabRawContent(activeId, loaded.content);
      }

      await tick();
      if (filePath) saveRecentFile(filePath);
    } catch (error) {
      console.error("Error loading file:", error);
      const errStr = String(error);
      if (
        errStr.includes("The system cannot find the file specified") ||
        errStr.includes("No such file or directory")
      ) {
        deleteRecentFile(filePath);
        if (tabManager.activeTab && tabManager.activeTab.path === filePath) {
          tabManager.closeTab(tabManager.activeTab.id);
        }
      }
    }
  }

  async function renderRichContent() {
    if (!markdownBody) return;

    const hasMermaid = !!markdownBody.querySelector("code.language-mermaid");
    const hasMath =
      !!markdownBody.querySelector("[data-math]") ||
      markdownBody.textContent?.includes("$$") ||
      markdownBody.textContent?.includes("$");
    const hasCode = !!markdownBody.querySelector("pre code");

    if (hasMermaid && !mermaid) {
      const mermaidModule = await import("mermaid");
      mermaid = mermaidModule.default;
    }

    if (hasCode && !hljs) {
      const [
        hljsModule,
        javascript,
        typescript,
        json,
        xml,
        css,
        markdownLang,
        bash,
        python,
        rust,
        sql,
      ] = await Promise.all([
        import("highlight.js/lib/core"),
        import("highlight.js/lib/languages/javascript"),
        import("highlight.js/lib/languages/typescript"),
        import("highlight.js/lib/languages/json"),
        import("highlight.js/lib/languages/xml"),
        import("highlight.js/lib/languages/css"),
        import("highlight.js/lib/languages/markdown"),
        import("highlight.js/lib/languages/bash"),
        import("highlight.js/lib/languages/python"),
        import("highlight.js/lib/languages/rust"),
        import("highlight.js/lib/languages/sql"),
      ]);
      hljs = hljsModule.default;
      hljs.registerLanguage("javascript", javascript.default);
      hljs.registerLanguage("typescript", typescript.default);
      hljs.registerLanguage("json", json.default);
      hljs.registerLanguage("html", xml.default);
      hljs.registerLanguage("xml", xml.default);
      hljs.registerLanguage("css", css.default);
      hljs.registerLanguage("markdown", markdownLang.default);
      hljs.registerLanguage("bash", bash.default);
      hljs.registerLanguage("shell", bash.default);
      hljs.registerLanguage("python", python.default);
      hljs.registerLanguage("rust", rust.default);
      hljs.registerLanguage("sql", sql.default);
    }

    if (hasMath && !katex) {
      const katexMainModule = await import("katex");
      katex = katexMainModule.default;
      (window as any).katex = katex;
      const [autoRenderModule] = await Promise.all([
        import("katex/dist/contrib/auto-render.js"),
        import("katex/dist/contrib/mhchem.js"),
        import("katex/dist/contrib/copy-tex.js"),
      ]);
      renderMathInElement = autoRenderModule.default;
    }

    await _renderRichContent(
      markdownBody,
      hljs,
      katex,
      renderMathInElement,
      mermaid,
      theme,
      tauriCommands.writeClipboardText,
    );
  }

  $effect(() => {
    if (sanitizedHtml && markdownBody && !isEditing) renderRichContent();
  });

  // Re-apply find highlights after the preview HTML is replaced. The
  // `bind:innerHTML={sanitizedHtml}` on the article wipes the DOM on every
  // edit/render pass; without this, highlights vanish until the user
  // re-types in the find bar.
  $effect(() => {
    const _ = sanitizedHtml;
    if (!findOpen || !findBar) return;
    tick().then(() => findBar?.reapply());
  });

  $effect(() => {
    // Depend on the ID and body existence to trigger restore
    const id = tabManager.activeTabId;
    const body = markdownBody;

    if (id && body) {
      untrack(() => {
        const tab = tabManager.tabs.find((t) => t.id === id);
        if (tab) {
          let scrolled = false;

          if (tab.anchorLine > 0) {
            // Interpolated Restore
            // Find element containing the anchor line
            const children = Array.from(body.children) as HTMLElement[];
            for (const el of children) {
              const sourcepos = el.dataset.sourcepos;
              if (sourcepos) {
                const [start, end] = sourcepos.split("-");
                const startLine = parseInt(start.split(":")[0]);
                const endLine = parseInt(end.split(":")[0]);

                if (!isNaN(startLine) && !isNaN(endLine)) {
                  if (
                    tab.anchorLine >= startLine &&
                    tab.anchorLine <= endLine
                  ) {
                    // Found the container
                    const totalLines = endLine - startLine; // Can be 0 for single line
                    let ratio = 0;
                    if (totalLines > 0) {
                      ratio = (tab.anchorLine - startLine) / totalLines;
                    }

                    // Calculate target pixel position
                    // We want the anchor line to be roughly at offset 60
                    const targetOffset =
                      el.offsetTop + el.offsetHeight * ratio - 60;
                    body.scrollTop = Math.max(0, targetOffset);
                    scrolled = true;
                    break;
                  }
                }
              }
            }
          }

          if (!scrolled) {
            if (
              body.scrollHeight > body.clientHeight &&
              tab.scrollPercentage > 0
            ) {
              const targetScroll =
                tab.scrollPercentage * (body.scrollHeight - body.clientHeight);
              body.scrollTop = targetScroll;
            } else {
              body.scrollTop = tab.scrollTop;
            }
          }
        }
      });
    }
  });

  $effect(() => {
    if (markdownBody && !isEditing && tabManager.activeTabId) {
      tick().then(() => {
        markdownBody?.focus({ preventScroll: true });
      });
    }
  });

  function scrollToLine(line: number, ratio: number = 0) {
    if (!markdownBody) return;

    const children = Array.from(markdownBody.children) as HTMLElement[];
    for (const el of children) {
      const sourcepos = el.dataset.sourcepos;
      if (sourcepos) {
        const [start, end] = sourcepos.split("-");
        const startLine = parseInt(start.split(":")[0]);
        const endLine = parseInt(end.split(":")[0]);

        if (!isNaN(startLine) && !isNaN(endLine)) {
          if (line >= startLine && line <= endLine) {
            const totalLines = endLine - startLine;
            let lineRatio = 0;
            if (totalLines > 0) {
              lineRatio = (line - startLine) / totalLines;
            }
            lineRatio = Math.max(0, Math.min(1, lineRatio));

            const elementTop = el.offsetTop + el.offsetHeight * lineRatio;

            const viewportHeight = markdownBody.clientHeight;
            const targetScroll = elementTop - viewportHeight * ratio;

            if (Math.abs(markdownBody.scrollTop - targetScroll) > 5) {
              isProgrammaticScroll = true;
              markdownBody.scrollTop = Math.max(0, targetScroll);
            }
            return;
          }
        }
      }
    }
  }

  function handleEditorScrollSync(line: number, ratio: number = 0) {
    if (tabManager.activeTab?.isScrollSynced) {
      scrollToLine(line, ratio);
    }
  }

  function syncEditorToPreviewScroll(target: HTMLElement) {
    if (!tabManager.activeTab?.isScrollSynced || !editorPane) return;

    const anchorOffset = target.scrollTop + 60;
    const viewportRatio =
      target.clientHeight > 0 ? Math.min(1, 60 / target.clientHeight) : 0;
    const children = Array.from(markdownBody?.children || []);

    for (const child of children) {
      const el = child as HTMLElement;
      if (
        el.offsetTop <= anchorOffset &&
        el.offsetTop + el.offsetHeight > anchorOffset
      ) {
        const sourcepos = el.dataset.sourcepos;
        if (!sourcepos) break;

        const [start, end] = sourcepos.split("-");
        const startLine = parseInt(start.split(":")[0]);
        const endLine = parseInt(end.split(":")[0]);

        if (!isNaN(startLine) && !isNaN(endLine)) {
          const relativeOffset = anchorOffset - el.offsetTop;
          const elementRatio =
            el.offsetHeight > 0 ? relativeOffset / el.offsetHeight : 0;
          const totalLines = endLine - startLine;
          const estimatedLine =
            startLine + Math.round(totalLines * elementRatio);

          editorPane.syncScrollToLine(estimatedLine, viewportRatio);
        }
        break;
      }
    }
  }

  let isScrolling = $state(false);
  let scrollIdleTimer: ReturnType<typeof setTimeout>;

  function handleScroll(e: Event) {
    const target = e.target as HTMLElement;

    isAtBottom =
      Math.abs(target.scrollHeight - target.scrollTop - target.clientHeight) <
      100;

    isScrolling = true;
    clearTimeout(scrollIdleTimer);
    scrollIdleTimer = setTimeout(() => {
      isScrolling = false;
    }, 300);

    if (isProgrammaticScroll) {
      isProgrammaticScroll = false;
      if (tabManager.activeTabId) {
        tabManager.updateTabScroll(tabManager.activeTabId, target.scrollTop);
      }
      return;
    }

    if (tabManager.activeTabId) {
      // Update raw scroll pos
      tabManager.updateTabScroll(tabManager.activeTabId, target.scrollTop);

      // Percentage fallback
      if (target.scrollHeight > target.clientHeight) {
        const percentage =
          target.scrollTop / (target.scrollHeight - target.clientHeight);
        tabManager.updateTabScrollPercentage(
          tabManager.activeTabId,
          percentage,
        );
      }

      // Interpolated Anchor Calculation
      const anchorOffset = target.scrollTop + 60;
      const children = Array.from(markdownBody?.children || []);

      for (const child of children) {
        const el = child as HTMLElement;
        // Check intersection
        if (
          el.offsetTop <= anchorOffset &&
          el.offsetTop + el.offsetHeight > anchorOffset
        ) {
          const sourcepos = el.dataset.sourcepos;
          if (sourcepos) {
            const [start, end] = sourcepos.split("-");
            const startLine = parseInt(start.split(":")[0]);
            const endLine = parseInt(end.split(":")[0]);

            if (!isNaN(startLine) && !isNaN(endLine)) {
              // Calculate relative position within element
              const relativeOffset = anchorOffset - el.offsetTop;
              const ratio = relativeOffset / el.offsetHeight;

              const totalLines = endLine - startLine;
              const estimatedLine = startLine + Math.round(totalLines * ratio);

              tabManager.updateTabAnchorLine(
                tabManager.activeTabId,
                estimatedLine,
              );
            }
          }
          break;
        }
      }
    }

    syncEditorToPreviewScroll(target);
  }

  function toggleFold(key: string) {
    const isCurrentlyCollapsed = collapsedHeaders.has(key);

    if (isCurrentlyCollapsed) {
      const next = new Set(collapsedHeaders);
      next.delete(key);
      collapsedHeaders = next;
    } else {
      collapsedHeaders = new Set([...collapsedHeaders, key]);
    }

    if (!markdownBody) return;

    let h = markdownBody.querySelector(
      `[id="${CSS.escape(key)}"].foldable-header`,
    ) as HTMLElement | null;
    if (!h) {
      const allHeaders = markdownBody.querySelectorAll(".foldable-header");
      for (const el of Array.from(allHeaders)) {
        if ((el.textContent?.trim() || "") === key) {
          h = el as HTMLElement;
          break;
        }
      }
    }
    if (!h) return;

    const wrapId = h.getAttribute("data-fold-target");
    const wrapper = wrapId ? document.getElementById(wrapId) : null;
    if (!wrapper) return;

    h.classList.toggle("is-collapsed", !isCurrentlyCollapsed);
    wrapper.classList.toggle("is-collapsed", !isCurrentlyCollapsed);
  }

  function scrollToAnchor(
    anchor: string,
    options: { pushHistory?: boolean } = {},
  ) {
    let id = decodeMarkdownLink(anchor);
    if (id.startsWith("^")) {
      id = id.substring(1);
    }
    const el =
      (markdownBody?.querySelector(
        `[id="${CSS.escape(id)}"]`,
      ) as HTMLElement | null) ||
      (markdownBody?.querySelector(
        `[name="${CSS.escape(id)}"]`,
      ) as HTMLElement | null);
    if (el && markdownBody) {
      if (options.pushHistory !== false) pushScrollHistory();
      const containerRect = markdownBody.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const targetScrollTop =
        elRect.top - containerRect.top + markdownBody.scrollTop - 60;
      markdownBody.scrollTo({ top: targetScrollTop, behavior: "smooth" });
      return true;
    }
    return false;
  }

  async function scrollToAnchorWhenReady(
    anchor: string,
    options: { pushHistory?: boolean } = {},
    expectedFile = currentFile,
  ) {
    const baseAttempts = 20;
    const maxAttempts = 60;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      if (expectedFile && currentFile !== expectedFile) return false;
      await tick();
      if (scrollToAnchor(anchor, options)) return true;
      const isFullDocumentLoading = tabManager.activeTabId
        ? loadingTabs.includes(tabManager.activeTabId)
        : false;
      if (attempt >= baseAttempts && !isFullDocumentLoading) return false;
      await new Promise((resolve) =>
        setTimeout(resolve, attempt < 5 ? 50 : 250),
      );
    }
    return false;
  }

  async function openRelativeMarkdownTarget(target: RelativeMarkdownTarget) {
    const isAbsoluteTarget = isAbsoluteMarkdownPath(target.path);
    if (!currentFile && !isAbsoluteTarget) return;
    const resolved = isAbsoluteTarget
      ? target.path
      : resolveMarkdownTarget(currentFile, target.path);
    if (
      normalizeComparableMarkdownPath(resolved, settings.osType) ===
      normalizeComparableMarkdownPath(currentFile, settings.osType)
    ) {
      if (target.hash) {
        await scrollToAnchorWhenReady(target.hash);
      } else if (markdownBody) {
        pushScrollHistory();
        markdownBody.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }
    if (tabManager.activeTabId && !(await canCloseTab(tabManager.activeTabId)))
      return;
    await loadMarkdown(resolved, { navigate: true });
    if (target.hash) {
      await scrollToAnchorWhenReady(
        target.hash,
        { pushHistory: false },
        resolved,
      );
    }
  }

  async function handleLinkClick(e: MouseEvent) {
    const target = e.target as HTMLElement;

    // header fold toggle
    const foldIcon = target.closest(".header-fold-icon");
    const foldableHeader = foldIcon
      ? (foldIcon.closest(".foldable-header") as HTMLElement)
      : null;
    if (foldableHeader) {
      if (e.detail > 1) e.preventDefault(); // prevent double-click selection
      e.stopPropagation();
      const key = foldableHeader.id || foldableHeader.textContent?.trim() || "";
      const wrapId = foldableHeader.getAttribute("data-fold-target");
      const wrapper = wrapId ? document.getElementById(wrapId) : null;
      if (wrapper) {
        const isCollapsed = foldableHeader.classList.toggle("is-collapsed");
        wrapper.classList.toggle("is-collapsed", isCollapsed);
        if (isCollapsed) {
          collapsedHeaders = new Set([...collapsedHeaders, key]);
        } else {
          const next = new Set(collapsedHeaders);
          next.delete(key);
          collapsedHeaders = next;
        }
      }
      return;
    }

    // callout fold toggle
    const calloutToggle = target.closest(".callout-toggle");
    if (calloutToggle) {
      if (e.detail > 1) e.preventDefault(); // prevent double-click selection
      e.stopPropagation();
      const alert = calloutToggle.closest(".callout-foldable");
      const content = alert?.querySelector(".markdown-alert-content");
      if (alert && content) {
        alert.classList.toggle("is-collapsed");
        content.classList.toggle("is-collapsed");
      }
      return;
    }

    // task checkbox toggle in read mode
    if (
      target.tagName === "INPUT" &&
      (target as HTMLInputElement).type === "checkbox" &&
      target.hasAttribute("data-task-checkbox")
    ) {
      e.preventDefault();
      e.stopPropagation();
      toggleTaskCheckbox(target as HTMLInputElement);
      return;
    }

    const a = target.closest("a");
    if (a) {
      const href = a.getAttribute("href");
      if (href?.startsWith("#") && href.length > 1) {
        e.preventDefault();
        await scrollToAnchorWhenReady(href.substring(1));
        return;
      }

      const relativeMarkdownTarget = href
        ? getRelativeMarkdownTarget(href)
        : null;
      if (relativeMarkdownTarget) {
        e.preventDefault();
        e.stopPropagation();
        await openRelativeMarkdownTarget(relativeMarkdownTarget);
        return;
      }
    }

    // media zoom handling
    const img = target.closest("img");
    if (img) {
      zoomData = { src: img.src };
      return;
    }

    const mermaidDiv = target.closest(".mermaid-diagram");
    if (mermaidDiv) {
      const svg = mermaidDiv.querySelector("svg");
      if (svg) {
        // clone and strip fixed dimensions so viewBox governs scaling
        const clone = svg.cloneNode(true) as SVGElement;
        clone.removeAttribute("width");
        clone.removeAttribute("height");
        clone.style.width = "";
        clone.style.height = "";
        zoomData = { html: clone.outerHTML };
        return;
      }
    }
  }

  async function toggleTaskCheckbox(checkbox: HTMLInputElement) {
    const tab = tabManager.activeTab;
    if (!tab || !tab.path) return;

    // always read latest from disk to avoid stale state
    let raw: string;
    try {
      raw = await tauriCommands.readFile(tab.path);
    } catch (e) {
      console.error("failed to read file for task toggle", e);
      return;
    }

    // find which task item this is by counting checkboxes in DOM
    const allBoxes = Array.from(
      markdownBody?.querySelectorAll("[data-task-checkbox]") || [],
    );
    const index = allBoxes.indexOf(checkbox);
    if (index === -1) return;

    // checkbox.checked is still the OLD state (e.preventDefault blocked the toggle)
    const nowChecked = !checkbox.checked;

    // replace the nth [ ] or [x] in the raw markdown
    let count = 0;
    const updated = raw.replace(
      /^(\s*[-*+] )\[( |x|X)\]/gm,
      (match, prefix) => {
        if (count === index) {
          count++;
          return `${prefix}[${nowChecked ? "x" : " "}]`;
        }
        count++;
        return match;
      },
    );

    if (updated === raw) return;

    // save file
    try {
      await tauriCommands.writeFile(tab.path, updated);
      tab.rawContent = updated;
      tab.originalContent = updated;
    } catch (e) {
      console.error("failed to save task toggle", e);
      return;
    }

    // update DOM optimistically
    checkbox.checked = nowChecked;
    const li = checkbox.closest("li");
    if (li) {
      li.classList.toggle("task-done", nowChecked);
    }
  }

  function saveRecentFile(path: string) {
    recentFiles = recentFilesStore.add(path);
  }

  function loadRecentFiles() {
    recentFiles = recentFilesStore.list();
  }

  function deleteRecentFile(path: string) {
    recentFiles = recentFilesStore.remove(path);
  }

  function refreshRecoverySnapshots() {
    recoverySnapshots = recoveryStore.list();
  }

  function persistRecoverySnapshots() {
    let failed = false;
    for (const tab of tabManager.tabs) {
      const shouldKeep =
        tab.isDirty || (tab.path === "" && tab.rawContent.trim() !== "");
      if (!shouldKeep) {
        recoveryStore.remove(tab.id);
        continue;
      }
      const saved = recoveryStore.save({
        id: tab.id,
        path: tab.path,
        title: tab.title,
        content: tab.rawContent,
        updatedAt: Date.now(),
      });
      if (!saved) failed = true;
    }

    if (failed && !recoverySaveWarningShown) {
      recoverySaveWarningShown = true;
      addToast(
        "Recovery storage is full. Save large documents to disk to keep them safe.",
        "warning",
      );
    } else if (!failed) {
      recoverySaveWarningShown = false;
    }
  }

  function restoreRecoverySnapshot(snapshot: DocumentSnapshot) {
    tabManager.addRecoveredTab(snapshot);
    recoveryStore.remove(snapshot.id);
    refreshRecoverySnapshots();
    showRecovery = recoverySnapshots.length > 0;
  }

  function discardRecoverySnapshot(snapshot: DocumentSnapshot) {
    recoveryStore.remove(snapshot.id);
    refreshRecoverySnapshots();
    showRecovery = recoverySnapshots.length > 0;
  }

  async function reloadExternalVersion() {
    const conflict = externalConflict;
    if (!conflict) return;
    externalConflict = null;
    await loadMarkdown(conflict.path, {
      skipTabManagement: true,
      resetScrollHistory: false,
    });
  }

  function keepLocalVersion() {
    externalConflict = null;
    saveStatus = "idle";
  }

  async function saveLocalConflictCopy() {
    externalConflict = null;
    await saveContentAs();
  }

  async function handleExternalFileChange(filePath: string) {
    if (!liveMode || !filePath) return;

    const until = selfWriteUntilByPath.get(filePath);
    if (until !== undefined) {
      if (Date.now() < until) return;
      selfWriteUntilByPath.delete(filePath);
    }

    const tab = tabManager.tabs.find((item) => item.path === filePath);
    if (!tab) return;

    const change = await inspectExternalFileChange({
      path: filePath,
      originalContent: tab.originalContent,
      isDirty: tab.isDirty,
      read: tauriCommands.readFile,
    });

    if (change.kind === "unchanged") return;

    if (change.kind === "missing") {
      tab.isDirty = true;
      addToast(
        "The file was moved or deleted externally. Your open copy was preserved.",
        "warning",
      );
      return;
    }

    if (change.kind === "unavailable") {
      console.error("Failed to reload external file change", change.error);
      addToast(
        "The file is temporarily unavailable. Your open copy was preserved.",
        "warning",
      );
      return;
    }

    if (change.kind === "conflict") {
      tabManager.setActive(tab.id);
      showHome = false;
      externalConflict = {
        path: filePath,
        content: change.content,
      };
      saveStatus = "conflict";
      return;
    }

    try {
      tabManager.setTabRawContent(tab.id, change.content);
      if (isMarkdownPath(filePath)) {
        const html = await tauriCommands.renderMarkdown(change.content);
        const processed = processMarkdownHtml(html, filePath, collapsedHeaders);
        tabManager.updateTabContent(tab.id, processed);
        if (tabManager.activeTabId === tab.id) {
          await tick();
          await renderRichContent();
        }
      }
    } catch (error) {
      console.error("Failed to process external file change", error);
    }
  }

  function removeRecentFile(path: string, event: MouseEvent) {
    event.stopPropagation();
    deleteRecentFile(path);
    if (currentFile === path) tabManager.closeTab(tabManager.activeTabId!);
  }

  function isYoutubeLink(url: string) {
    return url.includes("youtube.com/watch") || url.includes("youtu.be/");
  }

  function getYoutubeId(url: string) {
    const match = url.match(
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/,
    );
    return match && match[2].length === 11 ? match[2] : null;
  }

  function replaceWithYoutubeEmbed(element: Element, videoId: string) {
    const container = element.ownerDocument.createElement("div");
    container.className = "video-container";
    const iframe = element.ownerDocument.createElement("iframe");
    iframe.src = `https://www.youtube.com/embed/${videoId}`;
    iframe.title = "YouTube video player";
    iframe.frameBorder = "0";
    iframe.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = true;
    container.appendChild(iframe);
    element.replaceWith(container);
  }

  async function canCloseTab(
    tabId: string,
    options: { deferDiscardCleanup?: boolean } = {},
  ): Promise<boolean> {
    const tab = tabManager.tabs.find((t) => t.id === tabId);
    if (!tab || (!tab.isDirty && tab.path !== "")) return true;

    if (!tab.isDirty) return true;

    // Silent save path: only when auto-save is on, the user did NOT ask
    // for confirmation, and the tab has a real path. Untitled tabs always
    // need a save dialog, which means the modal flow is the right place
    // for them. We cancel the pending timer right before the manual save
    // to avoid a duplicate write from a timer that fires concurrently.
    if (settings.autoSave && !settings.confirmBeforeSave && tab.path !== "") {
      cancelPendingAutoSave(tabId);
      const success = await saveContent(tabId);
      // Only allow the close if the tab is fully clean afterwards.
      // `saveContent` resolves true even when post-save `isDirty=true`
      // (the user typed during the await — TOCTOU) — closing here
      // would silently drop those new keystrokes.
      if (success && !tab.isDirty) return true;
      if (success) {
        // Save succeeded but the tab is dirty again — let the user
        // decide via the modal whether to save again, discard, or cancel.
        addToast(t("toast.savedNewerEdits", settings.language), "info");
      } else {
        // Silent save failed — surface and fall through to the modal.
        addToast(t("toast.autoSaveFailed", settings.language), "error");
      }
    }

    const response = await askCustom(
      t("modal.youHaveUnsavedChanges", settings.language).replace(
        "{title}",
        tab.title,
      ),
      {
        title: t("modal.unsavedChanges", settings.language),
        kind: "warning",
        showSave: true,
      },
    );

    // Important: do NOT cancel the pending auto-save timer before this
    // modal. If the user clicks Cancel, the tab remains dirty and we
    // want background auto-save to keep firing on the existing schedule.
    if (response === "cancel") return false;
    if (response === "save") {
      cancelPendingAutoSave(tabId);
      return await saveContent(tabId);
    }

    // Discard: drop pending save so we don't write what the user just
    // threw away. The effect will re-arm a timer if the tab gets edited
    // again.
    if (!options.deferDiscardCleanup) cancelPendingAutoSave(tabId);
    return true;
  }

  async function toggleEdit(silentSave = false) {
    const tab = tabManager.activeTab;
    if (!tab || tab.path === undefined) return;
    if (isMarkdown && tab.isSplit) return;

    if (isEditing) {
      // Switch back to view
      if (tab.isDirty && tab.path !== "") {
        // `confirmBeforeSave` always wins: when the user has asked
        // for confirmation, every dirty toggle must show the modal,
        // even if the caller passed `silentSave=true` (hotkey path).
        const shouldSilent =
          !settings.confirmBeforeSave && (silentSave || settings.autoSave);
        if (shouldSilent) {
          cancelPendingAutoSave(tab.id);
          const success = await saveContent(tab.id);
          if (!success) {
            addToast(t("toast.autoSaveFailed", settings.language), "error");
            return; // If save fails, stay in edit mode
          }
        } else {
          const response = await askCustom(
            t("modal.youHaveUnsavedChangesBeforeReturning", settings.language),
            {
              title: t("modal.unsavedChanges", settings.language),
              kind: "warning",
              showSave: true,
            },
          );

          // Cancel only happens on save / discard. If user picks
          // Cancel, the pending auto-save timer keeps running.
          if (response === "cancel") return;
          if (response === "save") {
            cancelPendingAutoSave(tab.id);
            const success = await saveContent(tab.id);
            if (!success) return;
          } else if (response === "discard") {
            cancelPendingAutoSave(tab.id);
            tab.rawContent = tab.originalContent;
            tab.isDirty = false;
          }
        }
      }
      // If `saveContent` left `tab.isDirty=true` (TOCTOU — user typed
      // during the await), staying in edit mode is the safe default:
      // a non-editable dirty tab disables auto-save, blocks Cmd+S,
      // and risks getting clobbered by the next disk reload. Surface
      // a hint and keep the tab editable.
      if (tab.path !== "" && tab.isDirty) {
        addToast(t("toast.savedNewerEdits", settings.language), "info");
        return;
      }

      tab.isEditing = false;
      if (tab.path !== "") {
        await loadMarkdown(tab.path, { preserveEditState: true });
      } else {
        // Untitled: render the in-memory buffer for the preview.
        try {
          const html = await tauriCommands.renderMarkdown(tab.rawContent);
          const processedInfo = processMarkdownHtml(html, "", collapsedHeaders);
          tabManager.updateTabContent(tab.id, processedInfo);
        } catch (e) {
          console.error("Failed to render markdown", e);
        }
      }
    } else {
      // Switch to edit
      if (tab.path !== "") {
        if (tab.isDirty) {
          // Already have unsaved in-memory edits (e.g. from an
          // earlier session restored from localStorage, or from
          // post-save TOCTOU). Reading from disk would clobber
          // them, so just flip into edit mode without a reload.
          tab.isEditing = true;
        } else {
          try {
            const content = await tauriCommands.readFile(tab.path);
            tab.rawContent = content;
            tab.isEditing = true;
            tab.isDirty = false;
          } catch (e) {
            console.error("Failed to read file for editing", e);
          }
        }
      } else {
        tab.isEditing = true;
      }
    }
  }

  /**
   * Save the given (or active) tab to disk. Returns true on success.
   *
   * Important details:
   * - Operates on a snapshot of `rawContent` taken BEFORE the await, so further
   *   keystrokes during the in-flight invoke are not mistakenly marked clean
   *   (TOCTOU fix). The dirty flag is recomputed against the snapshot, not
   *   forced to false.
   * - Marks the destination path as a "self write" so the file-watcher does
   *   not bounce the change back into the editor and clobber unsaved input.
   * - Untitled tabs (empty path) are NOT silently auto-saved; they require an
   *   interactive save dialog (caller must come from a user gesture).
   */
  async function saveContent(tabId?: string): Promise<boolean> {
    const tab = tabId
      ? tabManager.tabs.find((t) => t.id === tabId)
      : tabManager.activeTab;
    if (!tab) return false;
    // No further gating: explicit user-initiated saves should always
    // work. Auto-save filters by `path !== '' && (isEditing || isSplit)`
    // in the effect itself, so untitled or view-mode tabs can only
    // reach this function through a modal "Save" choice or a hotkey,
    // both of which are legitimate save triggers — including for
    // untitled tabs in view mode (e.g. unsaved-changes modal at close).

    let targetPath = tab.path;

    if (!targetPath) {
      // Special handling for new (untitled) files
      const newFileType = tab.newFileType ?? "markdown";
      const selected = await save({
        filters:
          newFileType === "json"
            ? [{ name: "JSON", extensions: ["json"] }]
            : newFileType === "text"
              ? [{ name: "Texto", extensions: ["txt"] }]
              : [{ name: "Markdown", extensions: ["md"] }],
        defaultPath: tab.title,
      });
      if (selected) {
        targetPath = selected;
      } else {
        return false; // User cancelled save dialog
      }
    }

    const snapshot = tab.rawContent;
    saveStatus = "saving";

    try {
      const result = await persistDocument({
        path: targetPath,
        content: snapshot,
        getCurrentContent: () => tab.rawContent,
        write: tauriCommands.writeFile,
        markSelfWrite,
        clearSelfWrite,
      });
      if (!result.ok) throw result.error;
      // Refresh the grace window — the watcher event arrives after the write
      // completes, not when it started.
      if (tab.path === "") {
        // We just saved an untitled tab for the first time
        tabManager.updateTabPath(tab.id, targetPath);
        saveRecentFile(targetPath);
      }
      tab.originalContent = result.savedContent;
      tab.isDirty = result.isDirty;
      if (!tab.isDirty) recoveryStore.remove(tab.id);
      saveStatus = tab.isDirty ? "idle" : "saved";
      return true;
    } catch (e) {
      console.error("Failed to save file", e);
      saveStatus = "error";
      return false;
    }
  }

  async function saveContentAs(): Promise<boolean> {
    const tab = tabManager.activeTab;
    if (!tab) return false;

    const newFileType = tab.newFileType ?? "markdown";
    const selected = await save({
      filters: tab.path
        ? [{ name: "All Files", extensions: ["*"] }]
        : newFileType === "json"
          ? [{ name: "JSON", extensions: ["json"] }]
          : newFileType === "text"
            ? [{ name: "Texto", extensions: ["txt"] }]
            : [{ name: "Markdown", extensions: ["md"] }],
      defaultPath: tab.path || tab.title,
    });

    if (selected) {
      const snapshot = tab.rawContent;
      saveStatus = "saving";
      try {
        const result = await persistDocument({
          path: selected,
          content: snapshot,
          getCurrentContent: () => tab.rawContent,
          write: tauriCommands.writeFile,
          markSelfWrite,
          clearSelfWrite,
        });
        if (!result.ok) throw result.error;
        tabManager.updateTabPath(tab.id, selected);
        saveRecentFile(selected);
        tab.originalContent = result.savedContent;
        tab.isDirty = result.isDirty;
        if (!tab.isDirty) recoveryStore.remove(tab.id);
        saveStatus = tab.isDirty ? "idle" : "saved";
        return true;
      } catch (e) {
        console.error("Failed to save file as", e);
        saveStatus = "error";
        return false;
      }
    }
    return false;
  }

  /**
   * Auto-save effect.
   *
   * Watches every tab in the tab manager. For each tab that is dirty, has a
   * non-empty path (untitled files require an explicit Save dialog), and is
   * currently editable (edit-mode or split-mode), arms a per-tab debounce
   * timer that calls saveContent(tabId) when the typing pause exceeds
   * AUTO_SAVE_DEBOUNCE_MS.
   *
   * Per-tab timers (instead of a single timer keyed off the active tab) mean
   * a dirty background tab can still be flushed without the user revisiting
   * it — typical scenario when you switch tabs mid-edit.
   *
   * If `settings.autoSave` flips to false at runtime, all pending timers are
   * cancelled and a manual Cmd+S becomes the only path again.
   */
  $effect(() => {
    // Disable background auto-save in two cases:
    //   1. The user turned `autoSave` off entirely.
    //   2. The user enabled `confirmBeforeSave` — the Settings UI label
    //      promises confirmation before each save, so silent debounced
    //      writes contradict that contract. With this flag on, saves
    //      happen only via Cmd+S or via the close/toggle modals.
    if (!settings.autoSave || settings.confirmBeforeSave) {
      untrack(() => {
        for (const t of autoSaveTimers.values()) clearTimeout(t);
        autoSaveTimers.clear();
        lastContentRefByTab.clear();
      });
      return;
    }

    // Reactive reads — every keystroke flows through updateTabRawContent,
    // which assigns a new immutable string to `tab.rawContent`. Capturing
    // the reference here triggers re-runs on any edit (including
    // same-length ones like overwrite or formatting toggles).
    const snapshot = tabManager.tabs.map((tab) => ({
      id: tab.id,
      path: tab.path,
      isDirty: tab.isDirty,
      editable: tab.isEditing || tab.isSplit,
      contentRef: tab.rawContent,
    }));

    untrack(() => {
      const seenIds = new Set<string>();
      for (const s of snapshot) {
        seenIds.add(s.id);
        const eligible = s.isDirty && s.path !== "" && s.editable;
        const prevRef = lastContentRefByTab.get(s.id);
        const refChanged = prevRef !== s.contentRef;

        if (!eligible) {
          // Tab is no longer dirty / editable / has a path — drop
          // any pending timer and forget its tick.
          const existing = autoSaveTimers.get(s.id);
          if (existing) {
            clearTimeout(existing);
            autoSaveTimers.delete(s.id);
          }
          lastContentRefByTab.delete(s.id);
          continue;
        }

        if (!refChanged && autoSaveTimers.has(s.id)) {
          // Eligible but no new edit AND a timer is already armed —
          // leave it alone so background tabs don't get their
          // debounce reset by foreground typing.
          continue;
        }

        // Either content changed, or the tab just became eligible
        // (e.g. user pressed Save As). (Re)arm the debounce.
        const existing = autoSaveTimers.get(s.id);
        if (existing) clearTimeout(existing);
        lastContentRefByTab.set(s.id, s.contentRef);
        const timer = setTimeout(() => {
          autoSaveTimers.delete(s.id);
          // `saveContent` resolves with a boolean; it does not
          // reject on save failure, so `.catch` alone hid errors.
          // Surface failures via toast + console.
          saveContent(s.id).then(
            (ok) => {
              if (!ok) {
                console.error("Auto-save failed for tab", s.id);
                addToast(t("toast.autoSaveFailed", settings.language), "error");
              }
            },
            (e) => {
              console.error("Auto-save threw for tab", s.id, e);
              addToast(t("toast.autoSaveFailed", settings.language), "error");
            },
          );
        }, AUTO_SAVE_DEBOUNCE_MS);
        autoSaveTimers.set(s.id, timer);
      }
      // Tabs that were closed: drop their timers and tick records.
      for (const id of [...autoSaveTimers.keys()]) {
        if (!seenIds.has(id)) {
          clearTimeout(autoSaveTimers.get(id)!);
          autoSaveTimers.delete(id);
        }
      }
      for (const id of [...lastContentRefByTab.keys()]) {
        if (!seenIds.has(id)) lastContentRefByTab.delete(id);
      }
    });
  });

  async function exportAsHtml() {
    const tab = tabManager.activeTab;
    await _exportHtml({
      htmlContent: htmlContent,
      markdownBody,
      tabTitle: tab?.title || "",
      tabPath: tab?.path || "",
    });
  }

  function handleNewFile(type: NewFileType = "markdown") {
    tabManager.addNewTab(type);
    showHome = false;
  }

  function createFromTemplate(template: DocumentTemplate) {
    tabManager.addNewTab("markdown");
    const tab = tabManager.activeTab;
    if (!tab) return;
    tab.title = `${template.name}.md`;
    tab.rawContent = template.content;
    tab.originalContent = "";
    tab.isDirty = true;
    showHome = false;
  }

  async function selectFile() {
    const selected = await open({
      multiple: false,
      filters: [
        { name: "Markdown", extensions: ["md", "markdown", "mdown", "mkd"] },
        { name: "JSON", extensions: ["json", "jsonc"] },
        { name: "Texto", extensions: ["txt", "log", "csv"] },
        {
          name: "Código",
          extensions: [
            "js",
            "jsx",
            "ts",
            "tsx",
            "py",
            "html",
            "css",
            "scss",
            "less",
            "java",
            "c",
            "h",
            "cpp",
            "hpp",
            "cs",
            "go",
            "rs",
            "php",
            "rb",
            "sh",
            "bash",
            "ps1",
            "sql",
            "xml",
            "yaml",
            "yml",
            "toml",
          ],
        },
        { name: "All Files", extensions: ["*"] },
      ],
    });
    if (selected && typeof selected === "string") loadMarkdown(selected);
  }

  function toggleHome() {
    if (isZenCompactMode) {
      void setZenCompactMode(false);
    }
    showZenMode = false;
    showHome = !showHome;
  }

  function toggleZenMode() {
    showHome = false;
    showZenMode = !showZenMode;
    if (!showZenMode && isZenCompactMode) {
      void setZenCompactMode(false);
    }
  }

  async function setZenCompactMode(enabled: boolean) {
    if (!appWindow) return;

    if (enabled) {
      if (await appWindow.isMaximized()) {
        await appWindow.unmaximize();
      }
      const compactSize = new LogicalSize(450, 600);
      await appWindow.setResizable(false);
      await appWindow.setMinSize(compactSize);
      await appWindow.setMaxSize(compactSize);
      await appWindow.setSize(compactSize);
      await appWindow.center();
      isZenCompactMode = true;
      return;
    }

    await appWindow.setResizable(true);
    await appWindow.setMinSize(null);
    await appWindow.setMaxSize(null);
    await appWindow.setSize(new LogicalSize(1280, 800));
    await appWindow.center();
    isZenCompactMode = false;
  }

  async function toggleZenCompactMode() {
    await setZenCompactMode(!isZenCompactMode);
  }

  async function closeFile() {
    if (!tabManager.activeTabId) {
      await destroyWindowAfterTabsClosed();
      return;
    }

    await closeTabAndWindowIfLast(tabManager.activeTabId);
  }

  async function closeTabAndWindowIfLast(tabId: string) {
    if (!(await canCloseTab(tabId))) return;

    recoveryStore.remove(tabId);
    tabManager.closeTab(tabId);
    if (tabManager.tabs.length > 0) return;

    if (liveMode) await fileWatcher.sync([]);
    await destroyWindowAfterTabsClosed();
  }

  async function closeTabBatch(tabIds: string[]) {
    await closeTabsSafely(
      tabIds,
      (tabId) => canCloseTab(tabId, { deferDiscardCleanup: true }),
      (tabId) => {
        cancelPendingAutoSave(tabId);
        recoveryStore.remove(tabId);
        tabManager.closeTab(tabId);
      },
    );
  }

  async function destroyWindowAfterTabsClosed() {
    persistWindowSession(settings.restoreStateOnReopen, localStorage, () =>
      tabManager.serializeState(),
    );

    await appWindow?.destroy?.();
  }

  async function openFileLocation() {
    if (currentFile) await tauriCommands.revealFile(currentFile);
  }

  async function toggleLiveMode() {
    liveMode = !liveMode;
    const paths = tabManager.tabs
      .map((tab) => tab.path)
      .filter((path) => path && path !== "HOME");
    await fileWatcher.sync(liveMode ? paths : []);
    if (liveMode && currentFile) await handleExternalFileChange(currentFile);
  }

  async function saveImageAs(src: string) {
    let realPath = "";
    if (src.startsWith("asset:")) {
      try {
        const url = new URL(src);
        realPath = decodeURIComponent(url.pathname);
        if (realPath.startsWith("/localhost/")) {
          realPath = realPath.substring(11);
        } else if (realPath.startsWith("/")) {
          realPath = realPath.substring(1);
        }
      } catch (e) {
        console.error("Failed to parse asset URL:", e);
      }
    } else if (src.startsWith("http")) {
      try {
        const response = await fetch(src);
        const buffer = await response.arrayBuffer();
        const dest = await save({
          defaultPath: "image.png",
          filters: [
            { name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] },
          ],
        });
        if (dest) {
          await tauriCommands.writeBinaryFile(
            dest,
            Array.from(new Uint8Array(buffer)),
          );
          addToast("Image saved successfully");
        }
      } catch (e) {
        addToast("Failed to save remote image", "error");
      }
      return;
    }

    if (realPath) {
      const ext = realPath.split(".").pop() || "png";
      const dest = await save({
        defaultPath: `image.${ext}`,
        filters: [
          {
            name: "Images",
            extensions: ["png", "jpg", "jpeg", "webp", "gif", "svg"],
          },
        ],
      });
      if (dest) {
        try {
          await tauriCommands.copyFile(realPath, dest);
          addToast("Image saved successfully");
        } catch (e) {
          addToast(`Failed to save image: ${e}`, "error");
        }
      }
    }
  }

  async function saveDiagramAs(container: HTMLElement) {
    const svg = container.querySelector("svg")?.outerHTML;
    if (!svg) return;
    const dest = await save({
      defaultPath: "diagram.svg",
      filters: [{ name: "SVG Image", extensions: ["svg"] }],
    });
    if (dest) {
      try {
        await tauriCommands.writeFile(dest, svg);
        addToast("Diagram saved as SVG");
      } catch (e) {
        addToast(`Failed to save diagram: ${e}`, "error");
      }
    }
  }

  function handleContextMenu(e: MouseEvent) {
    if (mode !== "app") return;
    e.preventDefault();

    const selection = window.getSelection();
    const hasSelection = selection ? selection.toString().length > 0 : false;
    const isInsideEditor = (e.target as HTMLElement).closest(
      ".editor-container",
    );

    // detect heading for copy ref
    const heading = (e.target as HTMLElement).closest("h1, h2, h3, h4, h5, h6");
    let copyRefItem: any[] = [];
    if (heading) {
      const text = heading.textContent?.trim() || "";
      const tab = tabManager.activeTab;
      const filename = tab?.path
        ? tab.path
            .split(/[/\\]/)
            .pop()
            ?.replace(/\.[^.]+$/, "") || ""
        : "";
      const ref = filename ? `[[${filename}#${text}]]` : `#${text}`;
      copyRefItem = [
        {
          label: t("menu.copyReference", uiLanguage),
          onClick: () => tauriCommands.writeClipboardText(ref),
        },
        { separator: true },
      ];
    }

    const img = (e.target as HTMLElement).closest("img");
    let mediaItems: any[] = [];
    if (img) {
      mediaItems = [
        {
          label: t("menu.saveImageAs", uiLanguage),
          onClick: () => saveImageAs(img.src),
        },
        { separator: true },
      ];
    }

    const mermaidDiag = (e.target as HTMLElement).closest(".mermaid-diagram");
    if (mermaidDiag) {
      mediaItems = [
        {
          label: t("menu.saveDiagramAsSvg", uiLanguage),
          onClick: () => saveDiagramAs(mermaidDiag as HTMLElement),
        },
        { separator: true },
      ];
    }

    docContextMenu = {
      show: true,
      x: e.clientX,
      y: e.clientY,
      items: [
        ...copyRefItem,
        ...mediaItems,
        ...(isEditing && isInsideEditor
          ? [
              {
                label: t("menu.undo", uiLanguage),
                shortcut: "Ctrl+Z",
                onClick: () => editorPane?.undo(),
              },
              {
                label: t("menu.redo", uiLanguage),
                shortcut: "Ctrl+Y",
                onClick: () => editorPane?.redo(),
              },
              { separator: true },
            ]
          : []),
        ...(hasSelection
          ? [
              {
                label: t("menu.copy", uiLanguage),
                onClick: () => {
                  const selection = window.getSelection()?.toString();
                  if (selection) tauriCommands.writeClipboardText(selection);
                },
              },
            ]
          : []),
        {
          label: t("menu.selectAll", uiLanguage),
          onClick: () => {
            if (!markdownBody) return;
            const range = document.createRange();
            range.selectNodeContents(markdownBody);
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
          },
        },
        { separator: true },
        {
          label: t("menu.openLocation", uiLanguage),
          onClick: openFileLocation,
          disabled: !currentFile,
        },
        { label: t("menu.edit", uiLanguage), onClick: () => toggleEdit() },
        { separator: true },
        { label: t("menu.closeFile", uiLanguage), onClick: closeFile },
      ],
    };
  }

  function handleMouseOver(event: MouseEvent) {
    if (mode !== "app") return;
    let target = event.target as HTMLElement;
    while (target && target.tagName !== "A" && target !== document.body)
      target = target.parentElement as HTMLElement;
    if (target?.tagName === "A") {
      const anchor = target as HTMLAnchorElement;
      const rawHref = anchor.getAttribute("href") || "";

      // tooltip for same-page anchor links: show text of target header
      if (rawHref.startsWith("#")) {
        let id = rawHref.substring(1);
        if (id.startsWith("^")) id = id.substring(1);
        const el = markdownBody?.querySelector(
          `[id="${CSS.escape(id)}"]`,
        ) as HTMLElement | null;
        if (el) {
          // Use data-label if it's a block anchor, otherwise use textContent
          let text = el.getAttribute("data-label") || el.textContent || "";
          text = text.replace(/↩.*$/, "").trim(); // remove backrefs if any
          if (text) {
            const rect = anchor.getBoundingClientRect();
            tooltip = {
              show: true,
              text,
              shortcut: "",
              html: "",
              isFootnote: false,
              x: rect.left + rect.width / 2,
              y: rect.top - 8,
              align: "top",
            };
            return;
          }
        }
        return;
      }

      // footnote references: show footnote content instead of URL
      if (
        anchor.hasAttribute("data-footnote-ref") ||
        anchor.closest("[data-footnote-ref]") ||
        rawHref.match(/#fn-|#fnref-|#user-content-fn/)
      ) {
        const fnId = rawHref.replace(/^#/, "");
        const fnLi =
          markdownBody?.querySelector(`#${CSS.escape(fnId)}`) ||
          markdownBody?.querySelector(`li#${CSS.escape(fnId)}`);
        if (fnLi) {
          // clone to remove backref arrow from tooltip
          const clone = fnLi.cloneNode(true) as HTMLElement;
          const backrefs = clone.querySelectorAll(
            '.footnote-backref, a[href^="#fnref-"]',
          );
          backrefs.forEach((b) => b.remove());

          let fnHtml = clone.innerHTML.trim();
          if (fnHtml) {
            const rect = anchor.getBoundingClientRect();
            tooltip = {
              show: true,
              text: "",
              shortcut: "",
              html: fnHtml,
              isFootnote: true,
              x: rect.left + rect.width / 2,
              y: rect.top - 8,
              align: "top",
            };
            return;
          }
        }
      }

      if (anchor.href) {
        const rect = anchor.getBoundingClientRect();
        tooltip = {
          show: true,
          text: anchor.href,
          shortcut: "",
          html: "",
          isFootnote: false,
          x: rect.left + rect.width / 2,
          y: rect.top - 8,
          align: "top",
        };
      }
    }
  }

  function handleMouseOut(event: MouseEvent) {
    let target = event.target as HTMLElement;
    while (target && target.tagName !== "A" && target !== document.body)
      target = target.parentElement as HTMLElement;
    if (target?.tagName === "A") tooltip.show = false;
  }

  async function handleDocumentClick(event: MouseEvent) {
    if (mode !== "app") return;
    let target = event.target as HTMLElement;
    while (target && target.tagName !== "A" && target !== document.body)
      target = target.parentElement as HTMLElement;
    if (target?.tagName === "A") {
      const anchor = target as HTMLAnchorElement;
      const rawHref = anchor.getAttribute("href");
      if (!rawHref) return;

      if (rawHref.startsWith("#")) return;

      const relativeMarkdownTarget = getRelativeMarkdownTarget(rawHref);
      if (relativeMarkdownTarget) {
        event.preventDefault();
        await openRelativeMarkdownTarget(relativeMarkdownTarget);
        return;
      }

      if (anchor.href) {
        event.preventDefault();
        await openUrl(anchor.href);
      }
    }
  }

  let zoomLevel = $state(
    parseInt(localStorage.getItem("zoomLevel") || "100", 10),
  );

  $effect(() => {
    localStorage.setItem("zoomLevel", String(zoomLevel));
  });

  function handleWheel(e: WheelEvent) {
    if (e.ctrlKey || e.metaKey) {
      if (e.deltaY < 0) {
        zoomLevel = Math.min(zoomLevel + 10, 500);
      } else {
        zoomLevel = Math.max(zoomLevel - 10, 25);
      }
    }
  }

  let debounceTimer: number;

  $effect(() => {
    const tab = tabManager.activeTab;
    if (
      tab &&
      (tab.isSplit || (isEditing && settings.showToc)) &&
      tab.rawContent !== undefined
    ) {
      if ((tab as any)._lastRenderedRawContent === tab.rawContent) return;

      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        tauriCommands
          .renderMarkdown(tab.rawContent)
          .then((html) => {
            const processed = processMarkdownHtml(
              html as string,
              tab.path,
              collapsedHeaders,
            );
            tabManager.updateTabContent(tab.id, processed);
            (tab as any)._lastRenderedRawContent = tab.rawContent;
            tick().then(renderRichContent);
          })
          .catch(console.error);
      }, 16);
    }
  });

  async function toggleSplitView(tabId: string, silentSave = false) {
    const tab = tabManager.tabs.find((t) => t.id === tabId);
    if (!tab) return;
    if (tab.path === "" || isMarkdownPath(tab.path)) {
      if (!tab.isSplit) {
        tab.splitRatio = 0.6;
        tabManager.setSplitEnabled(tab.id, true);
      }
      return;
    }

    if (!tab.isSplit) {
      if (!tab.isEditing && !tab.rawContent && tab.path) {
        try {
          const content = await tauriCommands.readFile(tab.path);
          tab.rawContent = content;
          tab.originalContent = content;
        } catch (e) {
          console.error("Failed to load raw content for split view", e);
        }
      }
      tabManager.setSplitEnabled(tab.id, true);
      if (liveMode) toggleLiveMode();
    } else {
      if (tab.isDirty && tab.path !== "") {
        // `confirmBeforeSave` always wins: when the user has asked
        // for confirmation, every dirty toggle must show the modal,
        // even if the caller passed `silentSave=true` (hotkey path).
        const shouldSilent =
          !settings.confirmBeforeSave && (silentSave || settings.autoSave);
        if (shouldSilent) {
          cancelPendingAutoSave(tab.id);
          const success = await saveContent(tab.id);
          if (!success) {
            addToast(t("toast.autoSaveFailed", settings.language), "error");
            return;
          }
        } else {
          const response = await askCustom(
            t(
              "modal.youHaveUnsavedChangesBeforeClosingSplitView",
              settings.language,
            ),
            {
              title: t("modal.unsavedChanges", settings.language),
              kind: "warning",
              showSave: true,
            },
          );

          // Cancel keeps the pending auto-save timer alive.
          if (response === "cancel") return;
          if (response === "save") {
            cancelPendingAutoSave(tab.id);
            const success = await saveContent(tab.id);
            if (!success) return;
          } else if (response === "discard") {
            cancelPendingAutoSave(tab.id);
            tab.rawContent = tab.originalContent;
            tab.isDirty = false;
          }
        }
      }
      // Same TOCTOU guard as toggleEdit: if the user typed during
      // the save, the tab is still dirty. Keep it in split mode so
      // auto-save keeps firing and Cmd+S still works on it; flipping
      // it out would make a non-editable dirty tab.
      if (tab.path !== "" && tab.isDirty) {
        addToast(t("toast.savedNewerEdits", settings.language), "info");
        return;
      }

      tabManager.setSplitEnabled(tab.id, false);
      if (tab.path !== "") {
        await loadMarkdown(tab.path);
      }
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (mode !== "app") return;

    const cmdOrCtrl = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();
    const code = e.code;

    if (cmdOrCtrl && e.shiftKey && key === "p") {
      e.preventDefault();
      showCommandPalette = !showCommandPalette;
      return;
    }

    // On macOS the native menu accelerators (⌘T, ⌘W, ⌘S, ⌘Q) take priority
    // via NSMenu; the JS keydown handler should not also fire for them, or
    // we'd double-handle (e.g. open two new tabs on ⌘T). The !e.shiftKey
    // guards keep ⌘⇧T (undo close tab) routed through this handler as
    // before — only the bare combos are claimed by the menu.
    if (settings.osType === "macos" && cmdOrCtrl && !e.shiftKey) {
      if (key === "q") return; // → menu-app-quit
      if (key === "w") return; // → menu-file-close
      if (key === "s") return; // → menu-file-save
      if (key === "t") return; // → menu-file-new
    }

    const isSplit = tabManager.activeTab?.isSplit;

    if (cmdOrCtrl && key === "w") {
      e.preventDefault();
      closeFile();
    }
    if (cmdOrCtrl && e.code === "F4") {
      e.preventDefault();
      closeFile();
    }
    if (cmdOrCtrl && !e.shiftKey && key === "t") {
      e.preventDefault();
      tabManager.addHomeTab();
    }
    if (cmdOrCtrl && key === "q") {
      e.preventDefault();
      appWindow.close();
    }
    if (
      cmdOrCtrl &&
      !e.shiftKey &&
      !e.altKey &&
      (code === "Backslash" || code === "IntlBackslash")
    ) {
      e.preventDefault();
      if (tabManager.activeTabId) toggleSplitView(tabManager.activeTabId, true);
    }
    if (cmdOrCtrl && key === "e") {
      e.preventDefault();
      if (!isSplit) toggleEdit(true);
    }
    if (cmdOrCtrl && key === "s") {
      if (isEditing || isSplit) {
        e.preventDefault();
        saveContent();
      }
    }

    if (cmdOrCtrl && e.shiftKey && key === "t") {
      e.preventDefault();
      handleUndoCloseTab();
    }
    if (cmdOrCtrl && code === "Tab") {
      e.preventDefault();
      tabManager.cycleTab(e.shiftKey ? "prev" : "next");
    }
    if (cmdOrCtrl && code === "PageUp") {
      e.preventDefault();
      tabManager.cycleTab("prev");
    }
    if (cmdOrCtrl && code === "PageDown") {
      e.preventDefault();
      tabManager.cycleTab("next");
    }
    if (e.metaKey && e.altKey && code === "ArrowLeft") {
      e.preventDefault();
      tabManager.cycleTab("prev");
    }
    if (e.metaKey && e.altKey && code === "ArrowRight") {
      e.preventDefault();
      tabManager.cycleTab("next");
    }
    if (cmdOrCtrl && (key === "=" || key === "+")) {
      e.preventDefault();
      zoomLevel = Math.min(zoomLevel + 10, 500);
    }
    if (cmdOrCtrl && key === "-") {
      e.preventDefault();
      zoomLevel = Math.max(zoomLevel - 10, 25);
    }
    if (cmdOrCtrl && key === "0") {
      e.preventDefault();
      zoomLevel = 100;
    }
    if (cmdOrCtrl && key === ",") {
      e.preventDefault();
      showSettings = !showSettings;
    }
    // Ctrl/Cmd+F: route to either Monaco's built-in find or the preview
    // FindBar depending on focus and which panes are visible. We only
    // preventDefault when we actually take the action ourselves —
    // otherwise we let Monaco's own keybinding fire.
    if (cmdOrCtrl && !e.shiftKey && !e.altKey && key === "f") {
      const active = document.activeElement as Node | null;
      const editorHasFocus =
        !!editorPaneEl && !!active && editorPaneEl.contains(active);
      if (!editorHasFocus) {
        e.preventDefault();
        triggerFindAction();
      }
    }
  }

  function pushScrollHistory() {
    if (markdownBody) {
      scrollHistory.push(markdownBody.scrollTop);
      scrollFuture = [];
      if (scrollHistory.length > 50) scrollHistory.shift();
    }
  }

  function handleMouseUp(e: MouseEvent) {
    if (e.button === 3) {
      // Back
      e.preventDefault();
      // try in-page scroll history first
      if (scrollHistory.length > 0 && markdownBody) {
        scrollFuture.push(markdownBody.scrollTop);
        const pos = scrollHistory.pop()!;
        isProgrammaticScroll = true;
        markdownBody.scrollTo({ top: pos, behavior: "smooth" });
      } else if (tabManager.activeTabId) {
        const path = tabManager.goBack(tabManager.activeTabId);
        if (path) {
          loadMarkdown(path, {
            skipTabManagement: true,
            resetScrollHistory: true,
          });
        }
      }
    } else if (e.button === 4) {
      // Forward
      e.preventDefault();
      if (scrollFuture.length > 0 && markdownBody) {
        scrollHistory.push(markdownBody.scrollTop);
        const pos = scrollFuture.pop()!;
        isProgrammaticScroll = true;
        markdownBody.scrollTo({ top: pos, behavior: "smooth" });
      } else if (tabManager.activeTabId) {
        const path = tabManager.goForward(tabManager.activeTabId);
        if (path) {
          loadMarkdown(path, {
            skipTabManagement: true,
            resetScrollHistory: true,
          });
        }
      }
    }
  }

  async function handleUndoCloseTab() {
    const path = tabManager.popRecentlyClosed();
    if (path) {
      await loadMarkdown(path);
    }
  }

  async function handleDetach(tabId: string) {
    if (!(await canCloseTab(tabId))) return;
    const tab = tabManager.tabs.find((t) => t.id === tabId);
    if (!tab || !tab.path) return;

    const path = tab.path;
    tabManager.closeTab(tabId);

    const label = "window-" + Date.now();
    const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
    const webview = new WebviewWindow(label, {
      url: "index.html?file=" + encodeURIComponent(path),
      title: "Draftly - " + path.split(/[/\\]/).pop(),
      width: 1000,
      height: 800,
    });
  }

  function startDrag(e: MouseEvent, tabId: string | null) {
    if (!tabId) return;
    e.preventDefault();
    const startX = e.clientX;
    const tab = tabManager.tabs.find((t) => t.id === tabId);
    if (!tab) return;

    const startRatio = tab.splitRatio ?? 0.5;
    const containerWidth = window.innerWidth;

    const onMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaRatio = deltaX / containerWidth;
      tabManager.setSplitRatio(tabId, startRatio + deltaRatio);
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    document.body.style.cursor = "col-resize";
  }

  function getSplitTransition(
    node: Element,
    { isEditing, side }: { isEditing: boolean; side: "left" | "right" },
  ) {
    let shouldAnimate = false;
    let x = 0;

    if (side === "left") {
      if (!isEditing) {
        shouldAnimate = true;
        x = -50;
      }
    } else {
      if (isEditing) {
        shouldAnimate = true;
        x = 50;
      }
    }

    if (shouldAnimate) {
      return fly(node, { x, duration: 250 });
    }
    return { duration: 0 };
  }

  onMount(() => {
    loadRecentFiles();
    refreshRecoverySnapshots();
    showRecovery = recoverySnapshots.length > 0;
    const recoveryInterval = window.setInterval(persistRecoverySnapshots, 5000);

    // Defer loading of highlight.js and KaTeX until needed by the content.

    let unlisteners: (() => void)[] = [];

    tauriCommands.showWindow().catch(console.error);

    const init = async () => {
      const appMode = await tauriCommands.getAppMode();

      const restoredSession = restoreWindowSession(
        settings.restoreStateOnReopen,
        localStorage,
        (value) => tabManager.restoreState(value),
      );
      if (restoredSession) {
        for (const tab of tabManager.tabs) {
          if (!tab.content && tab.rawContent) {
            tauriCommands
              .renderMarkdown(tab.rawContent)
              .then((html) => {
                const processed = processMarkdownHtml(
                  html,
                  tab.path,
                  collapsedHeaders,
                );
                tabManager.updateTabContent(tab.id, processed);
                if (tabManager.activeTabId === tab.id) {
                  tick().then(renderRichContent);
                }
              })
              .catch(console.error);
          }
        }
      }

      const urlParams = new URLSearchParams(window.location.search);
      const fileParam = urlParams.get("file");
      if (fileParam) {
        const decodedPath = decodeURIComponent(fileParam);
        await loadMarkdown(decodedPath);
      }

      unlisteners.push(
        await appWindow.onFocusChanged(
          ({ payload: focused }: { payload: boolean }) => {
            isFocused = focused;
          },
        ),
      );
      unlisteners.push(
        await listen<string>("file-changed", async (event) => {
          await handleExternalFileChange(event.payload);
        }),
      );

      unlisteners.push(
        await listen("file-path", (event) => {
          const filePath = event.payload as string;
          if (filePath) loadMarkdown(filePath);
        }),
      );
      unlisteners.push(
        await listen("menu-close-file", () => {
          closeFile();
        }),
      );
      unlisteners.push(
        await listen("menu-edit-file", () => {
          toggleEdit();
        }),
      );
      unlisteners.push(
        await listen("menu-tab-rename", async (event) => {
          const tabId = event.payload as string;
          const tab = tabManager.tabs.find((t) => t.id === tabId);
          if (!tab || !tab.path) return;

          const newName = window.prompt(
            t("menu.renameFile", settings.language),
            tab.title,
          );
          if (newName && newName !== tab.title) {
            const oldPath = tab.path;
            const newPath = oldPath.replace(
              /[/\\][^/\\]+$/,
              (m) => m.charAt(0) + newName,
            );
            try {
              await tauriCommands.renameFile(oldPath, newPath);
              tabManager.renameTab(tabId, newPath);
              recentFiles = recentFilesStore.rename(oldPath, newPath);
            } catch (e) {
              console.error("Failed to rename file", e);
              await askCustom(`Failed to rename file: ${e}`, {
                title: "Error",
                kind: "error",
              });
            }
          }
        }),
      );
      unlisteners.push(
        await listen("menu-tab-new", () => {
          tabManager.addNewTab();
        }),
      );
      unlisteners.push(
        await listen("menu-tab-undo", () => {
          console.log("Received menu-tab-undo event");
          handleUndoCloseTab();
        }),
      );
      unlisteners.push(
        await listen("menu-tab-close", async (event) => {
          const tabId = event.payload as string;
          await closeTabAndWindowIfLast(tabId);
        }),
      );
      unlisteners.push(
        await listen("menu-tab-close-others", async (event) => {
          const tabId = event.payload as string;
          const tabsToClose = tabManager.tabs
            .filter((t) => t.id !== tabId)
            .map((t) => t.id);
          await closeTabBatch(tabsToClose);
        }),
      );
      unlisteners.push(
        await listen("menu-tab-close-right", async (event) => {
          const tabId = event.payload as string;
          const index = tabManager.tabs.findIndex((t) => t.id === tabId);
          if (index !== -1) {
            const tabsToClose = tabManager.tabs
              .slice(index + 1)
              .map((t) => t.id);
            await closeTabBatch(tabsToClose);
          }
        }),
      );
      // Native macOS menubar — Draftly ▸ Quit and File ▸ * — bridged
      // to the same handlers the in-window burger button uses, so the
      // menu and the burger stay behaviourally identical. Save mirrors
      // the keydown guard (`isEditing || isSplit`) so menu ⌘S in pure
      // view mode is a no-op, matching the keyboard shortcut.
      unlisteners.push(await listen("menu-app-quit", () => appExit()));
      unlisteners.push(await listen("menu-file-new", () => handleNewFile()));
      unlisteners.push(await listen("menu-file-open", () => selectFile()));
      unlisteners.push(await listen("menu-file-close", () => closeFile()));
      unlisteners.push(
        await listen("menu-file-save", () => {
          if (isEditing || tabManager.activeTab?.isSplit) saveContent();
        }),
      );
      unlisteners.push(
        await listen("menu-file-save-as", () => saveContentAs()),
      );
      unlisteners.push(
        await listen("menu-file-export-html", () => openExportPreview()),
      );
      unlisteners.push(
        await listen("menu-file-export-pdf", () => openExportPreview()),
      );
      unlisteners.push(
        await appWindow.onCloseRequested(
          async (event: { preventDefault: () => void }) => {
            console.log("onCloseRequested triggered");
            if (isForceExiting) return;

            // CRITICAL: before serializing tab state to localStorage
            // (the restore-on-reopen path), make sure all pending
            // auto-save edits are actually flushed to disk. Without
            // this, closing the window with auto-save on but
            // confirmBeforeSave off would silently put unsaved edits
            // in localStorage only and never persist them to file.
            if (settings.autoSave && !settings.confirmBeforeSave) {
              await flushDirtyFileTabs(tabManager.tabs, {
                save: saveContent,
                cancelPending: cancelPendingAutoSave,
                onError: (tabId, error) => {
                  console.error(
                    "Flush-on-close save failed for tab",
                    tabId,
                    error,
                  );
                },
              });
            }

            if (settings.restoreStateOnReopen) {
              try {
                persistWindowSession(true, localStorage, () =>
                  tabManager.serializeState(),
                );
              } catch (e) {
                console.error("Failed to save state on close:", e);
              }
              return;
            }

            const dirtyTabs = tabManager.tabs.filter((t) => t.isDirty);
            console.log("Dirty tabs:", dirtyTabs.length);
            if (dirtyTabs.length > 0) {
              console.log("Preventing default close");
              event.preventDefault();

              // Auto-save without confirmation: try silently saving every dirty
              // tab that has a real path. If untitled tabs exist they need a
              // Save dialog, so we just fall through to the modal — that is
              // NOT a failure case and shouldn't show an error toast. We
              // also DON'T clear pending timers up front: if the user picks
              // Cancel in the modal below, we want the timers to keep
              // running for tabs that are still dirty.
              if (settings.autoSave && !settings.confirmBeforeSave) {
                const tabsWithPath = dirtyTabs.filter((t) => t.path !== "");
                const hasUntitled = dirtyTabs.some((t) => t.path === "");
                if (!hasUntitled) {
                  const allOk = await saveTabsSequentially(tabsWithPath, {
                    beforeSave: cancelPendingAutoSave,
                    save: saveContent,
                  });
                  if (allOk) {
                    appWindow.close();
                    return;
                  }
                  // A real save failure happened — surface it.
                  addToast(
                    t("toast.autoSaveFailed", settings.language),
                    "error",
                  );
                }
                // hasUntitled: skip toast, just fall through to the modal.
              }

              const response = await askCustom(
                t("modal.youHaveUnsavedFiles", settings.language).replace(
                  "{{count}}",
                  dirtyTabs.length.toString(),
                ),
                {
                  title: t("modal.unsavedChanges", settings.language),
                  kind: "warning",
                  showSave: true,
                },
              );

              if (response === "save") {
                const saved = await saveTabsSequentially(dirtyTabs, {
                  beforeSave: async (tabId) => {
                    tabManager.setActive(tabId);
                    await tick();
                    cancelPendingAutoSave(tabId);
                  },
                  save: saveContent,
                });
                if (!saved) return;
                appWindow.close();
              } else if (response === "discard") {
                // Force close by removing this listener or skipping check?
                // Since we are inside the event handler, we can't easily remove "this" listener specifically
                // without refactoring how unlisteners are stored/accessed relative to this callback.
                // However, if we just want to exit, we can use exit() from rust or just appWindow.destroy()?
                // WebviewWindow.close() triggers this event again.
                // Solution: invoke a command to exit forcefully or set a flag.
                // The simplest might be to just clear the dirty flags and close.
                tabManager.tabs.forEach((t) => (t.isDirty = false));
                appWindow.close();
              }
            }
          },
        ),
      );

      unlisteners.push(
        await appWindow.onDragDropEvent(
          (event: {
            payload: { type: string; position: { x: any; y: any }; paths: any };
          }) => {
            if (
              event.payload.type === "enter" ||
              event.payload.type === "over"
            ) {
              const { x, y } = event.payload.position;
              isDragging = true;

              if (editorPaneEl) {
                const rect = editorPaneEl.getBoundingClientRect();
                if (
                  x >= rect.left &&
                  x <= rect.right &&
                  y >= rect.top &&
                  y <= rect.bottom
                ) {
                  dragTarget = "editor";
                  if (editorPane) editorPane.updateDragCaret(x, y);
                } else if (viewerPaneEl) {
                  const vRect = viewerPaneEl.getBoundingClientRect();
                  if (
                    x >= vRect.left &&
                    x <= vRect.right &&
                    y >= vRect.top &&
                    y <= vRect.bottom
                  ) {
                    dragTarget = "preview";
                    if (editorPane) editorPane.hideDragCaret();
                  } else {
                    dragTarget = null;
                    if (editorPane) editorPane.hideDragCaret();
                  }
                } else {
                  dragTarget = null;
                  if (editorPane) editorPane.hideDragCaret();
                }
              }
            } else if (event.payload.type === "drop") {
              const { x, y } = event.payload.position;
              const paths = event.payload.paths;
              const currentEditor = editorPane;
              if (currentEditor) currentEditor.hideDragCaret();
              if (dragTarget === "editor" && currentEditor) {
                paths.forEach((path: string) => {
                  const ext = path.split(".").pop()?.toLowerCase();
                  if (
                    ext &&
                    ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)
                  ) {
                    currentEditor.handleDroppedFile(path, x, y);
                  }
                });
              } else if (dragTarget === "preview" || (!isSplit && !isEditing)) {
                paths.forEach((path: string) => {
                  if (isMarkdownPath(path)) {
                    loadMarkdown(path);
                  } else {
                    const filename = path.split(/[\/\\]/).pop() || "File";
                    addToast(
                      t("toast.unsupportedFile").replace(
                        "{{filename}}",
                        filename,
                      ),
                      "error",
                    );
                  }
                });
              }

              isDragging = false;
              dragTarget = null;
            } else if (event.payload.type === "leave") {
              isDragging = false;
              dragTarget = null;
              if (editorPane) editorPane.hideDragCaret();
            }
          },
        ),
      );

      try {
        const args = await tauriCommands.getStartupFiles();
        if (args?.length > 0) {
          await loadMarkdown(args[0]);
        }
      } catch (error) {
        console.error("Error receiving Markdown file path:", error);
      }

      mode = appMode;
    };

    init();

    return () => {
      window.clearInterval(recoveryInterval);
      persistRecoverySnapshots();
      void fileWatcher.sync([]);
      unlisteners.forEach((u) => u());
    };
  });
</script>

<svelte:document
  onclick={handleDocumentClick}
  oncontextmenu={handleContextMenu}
  onmouseover={handleMouseOver}
  onmouseout={handleMouseOut}
  onkeydown={handleKeyDown}
  onmouseup={handleMouseUp}
/>

{#if mode === "loading"}
  <TitleBar
    {isFocused}
    isScrolled={false}
    currentFile={""}
    {liveMode}
    windowTitle="Draftly"
    showHome={false}
    showZenMode={false}
    {zoomLevel}
    onselectFile={selectFile}
    onopenFile={() => {
      showZenMode = false;
      selectFile();
    }}
    onsaveFile={saveContent}
    onsaveFileAs={saveContentAs}
    onexportHtml={openExportPreview}
    onexportPdf={openExportPreview}
    onexit={appExit}
    ontoggleHome={toggleHome}
    ontoggleZenMode={toggleZenMode}
    onopenFileLocation={openFileLocation}
    ontoggleLiveMode={toggleLiveMode}
    {isEditing}
    ondetach={handleDetach}
    ontabclick={() => (showHome = false)}
    onresetZoom={() => (zoomLevel = 100)}
    {theme}
    onSetTheme={(nextTheme: string) => (theme = nextTheme)}
    onopenSettings={() => (showSettings = true)}
    oncloseTab={closeTabAndWindowIfLast}
  />
  <div class="loading-screen">
    <svg class="spinner" viewBox="0 0 50 50">
      <circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="4"
      ></circle>
    </svg>
  </div>
{:else if mode === "installer"}
  <Installer />
{:else if mode === "uninstall"}
  <Uninstaller />
{:else}
  <TitleBar
    {isFocused}
    {isScrolled}
    {currentFile}
    {liveMode}
    {windowTitle}
    {showHome}
    {showZenMode}
    {zoomLevel}
    onselectFile={selectFile}
    onopenFile={() => {
      showZenMode = false;
      selectFile();
    }}
    onsaveFile={saveContent}
    onsaveFileAs={saveContentAs}
    onexportHtml={openExportPreview}
    onexportPdf={openExportPreview}
    onexit={appExit}
    ontoggleHome={toggleHome}
    ontoggleZenMode={toggleZenMode}
    onopenFileLocation={openFileLocation}
    ontoggleLiveMode={toggleLiveMode}
    {isEditing}
    ondetach={handleDetach}
    ontabclick={() => {
      showHome = false;
      showZenMode = false;
    }}
    onresetZoom={() => (zoomLevel = 100)}
    {isScrollSynced}
    ontoggleSync={() =>
      tabManager.activeTabId &&
      tabManager.toggleScrollSync(tabManager.activeTabId)}
    {theme}
    onSetTheme={(nextTheme: string) => (theme = nextTheme)}
    onopenSettings={() => (showSettings = true)}
    oncloseTab={closeTabAndWindowIfLast}
  />

  <Settings
    show={showSettings}
    {theme}
    onSetTheme={(nextTheme: string) => (theme = nextTheme)}
    onclose={() => (showSettings = false)}
  />

  <CommandPalette
    show={showCommandPalette}
    items={commandPaletteItems}
    onclose={() => (showCommandPalette = false)}
  />

  <ExportPreviewModal
    bind:open={showExportPreview}
    htmlContent={exportPreviewContent}
    tabTitle={exportPreviewTitle}
    tabPath={exportPreviewPath}
    language={settings.language}
  />

  <RecoveryDialog
    show={showRecovery}
    snapshots={recoverySnapshots}
    language={settings.language}
    onrestore={restoreRecoverySnapshot}
    ondiscard={discardRecoverySnapshot}
    onclose={() => (showRecovery = false)}
  />

  <ExternalConflictDialog
    show={externalConflict !== null}
    fileName={externalConflict?.path.split(/[/\\]/).pop() || ""}
    onreload={reloadExternalVersion}
    onkeep={keepLocalVersion}
    onsavecopy={saveLocalConflictCopy}
  />

  <FindBar
    bind:this={findBar}
    bind:open={findOpen}
    markdownBody={showZenMode ? zenSearchTarget : markdownBody}
    language={settings.language}
  />

  {#if showZenMode}
    <div
      class="zen-mode-shell"
      class:rail-on-left={settings.showSidebar && settings.tocSide === "left"}
      class:rail-on-right={settings.showSidebar && settings.tocSide === "right"}
    >
      {#if settings.showSidebar}
        <div
          class="toc-rail zen-rail"
          class:on-right={settings.tocSide === "right"}
        >
          <button class="toc-rail-button" onclick={toggleHome}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M3 10.5L12 3l9 7.5"></path>
              <path d="M5 10v10h14V10"></path>
              <path d="M9 20v-6h6v6"></path>
            </svg>
            <span class="visually-hidden"
              >{t("common.home", settings.language)}</span
            >
          </button>
          <button
            class="toc-rail-button"
            class:active={findOpen}
            data-find-toggle="true"
            onclick={triggerFindAction}
          >
            <svg
              width="16"
              height="16"
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
            <span class="visually-hidden"
              >{t("tooltip.find", settings.language)}</span
            >
          </button>
          <button
            class="toc-rail-button"
            class:active={isZenCompactMode}
            onclick={() => void toggleZenCompactMode()}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <rect x="5" y="4" width="14" height="16" rx="2"></rect>
              <path d="M9 8h6"></path>
              <path d="M9 12h6"></path>
              <path d="M9 16h4"></path>
            </svg>
            <span class="visually-hidden">Modo compacto</span>
          </button>
          <button
            class="toc-rail-button"
            class:active={settings.showMarkdownToolbar}
            onclick={() => settings.toggleMarkdownToolbar()}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                stroke-width="2"
              ></circle>
              <circle cx="12" cy="12" r="3.2" fill="currentColor"></circle>
            </svg>
            <span class="visually-hidden"
              >{t("settings.markdownToolbar", settings.language)}</span
            >
          </button>
        </div>
      {/if}
      <ZenNotes bind:searchTarget={zenSearchTarget} />
    </div>
  {:else if tabManager.activeTab && (tabManager.activeTab.path !== "" || tabManager.activeTab.title !== "Recents") && !showHome}
    <div
      class="markdown-container"
      style="zoom: {zoomLevel /
        100}; --code-font: {settings.previewFont}, monospace; --code-font-size: {Math.max(
        10,
        settings.previewFontSize - 1,
      )}px; --highlight-color: {highlightColorMap[settings.highlightColor] ||
        highlightColorMap.yellow};"
      onwheel={handleWheel}
      role="presentation"
    >
      <div
        class="layout-container"
        class:split={isSplit}
        class:editing={isEditing}
        class:has-open-toc={isMarkdown && settings.showToc}
        class:toc-on-left={settings.tocSide === "left"}
        class:toc-on-right={settings.tocSide === "right"}
      >
        {#if !showHome && settings.showSidebar}
          <div class="toc-rail" class:on-right={settings.tocSide === "right"}>
            <button class="toc-rail-button" onclick={() => (showHome = true)}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M3 10.5L12 3l9 7.5"></path>
                <path d="M5 10v10h14V10"></path>
                <path d="M9 20v-6h6v6"></path>
              </svg>
              <span class="visually-hidden"
                >{t("common.home", settings.language)}</span
              >
            </button>
            <button
              class="toc-rail-button"
              class:active={findOpen}
              data-find-toggle="true"
              onclick={triggerFindAction}
            >
              <svg
                width="16"
                height="16"
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
              <span class="visually-hidden"
                >{t("tooltip.find", settings.language)}</span
              >
            </button>
            {#if isMarkdown}
              <button
                class="toc-rail-button"
                class:active={settings.showToc}
                onclick={() => settings.toggleToc()}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 100 90"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M10 0C4.485 0 0 4.485 0 10V80C0 85.515 4.485 90 10 90H90C95.515 90 100 85.515 100 80V10C100 4.485 95.515 0 90 0H10ZM45 80H10V10H45V80ZM80 40C82.7614 40 85 42.2386 85 45C85 47.7614 82.7614 50 80 50H65C62.2386 50 60 47.7614 60 45C60 42.2386 62.2386 40 65 40H80ZM80 20C82.7614 20 85 22.2386 85 25C85 27.7614 82.7614 30 80 30H65C62.2386 30 60 27.7614 60 25C60 22.2386 62.2386 20 65 20H80Z"
                    fill="currentColor"
                  />
                </svg>
                <span class="visually-hidden"
                  >{t("tooltip.showTableOfContents", settings.language)}</span
                >
              </button>
              <button
                class="toc-rail-button"
                class:active={settings.showMarkdownToolbar}
                onclick={() => settings.toggleMarkdownToolbar()}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    stroke="currentColor"
                    stroke-width="2"
                  ></circle>
                  <circle cx="12" cy="12" r="3.2" fill="currentColor"></circle>
                </svg>
                <span class="visually-hidden"
                  >{t("settings.markdownToolbar", settings.language)}</span
                >
              </button>
            {/if}
          </div>
        {/if}

        <!-- Editor Pane -->
        <div
          bind:this={editorPaneEl}
          class="pane editor-pane"
          class:active={isEditing || isSplit}
          class:markdown-toolbar-pane={isMarkdown &&
            settings.showMarkdownToolbar}
          style="flex: {isSplit
            ? tabManager.activeTab.splitRatio
            : isEditing
              ? 1
              : 0}"
        >
          {#if isEditing || isSplit}
            <div class="editor-shell">
              <div class="editor-surface">
                <Editor
                  bind:this={editorPane}
                  bind:value={tabManager.activeTab.rawContent}
                  language={editorLanguage}
                  plainTextMode={isPlainText}
                  {theme}
                  onsave={saveContent}
                  ontoast={addToast}
                  bind:zoomLevel
                  onnew={handleNewFile}
                  onopen={selectFile}
                  onclose={closeFile}
                  onreveal={openFileLocation}
                  ontoggleEdit={() => toggleEdit()}
                  ontoggleLive={toggleLiveMode}
                  ontoggleSplit={() =>
                    tabManager.activeTabId &&
                    toggleSplitView(tabManager.activeTabId)}
                  onhome={() => (showHome = true)}
                  onnextTab={() => tabManager.cycleTab("next")}
                  onprevTab={() => tabManager.cycleTab("prev")}
                  onundoClose={handleUndoCloseTab}
                  onscrollsync={handleEditorScrollSync}
                />
              </div>
            </div>
          {/if}
        </div>

        <!-- Splitter -->
        {#if isSplit}
          <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
          <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
          <div
            class="split-bar"
            onmousedown={(e) => startDrag(e, tabManager.activeTabId)}
            onkeydown={handleSplitterKeyDown}
            role="separator"
            aria-orientation="vertical"
            tabindex="0"
          ></div>
        {/if}

        <!-- Viewer Pane -->
        <div
          bind:this={viewerPaneEl}
          class="pane viewer-pane"
          class:active={!isEditing || isSplit}
          style="flex: {isSplit
            ? 1 - tabManager.activeTab.splitRatio
            : !isEditing
              ? 1
              : 0}"
        >
          <div class="viewer-content">
            <article
              bind:this={markdownBody}
              contenteditable="false"
              class="markdown-body full-width {settings.showToc
                ? 'toc-active'
                : ''}"
              bind:innerHTML={sanitizedHtml}
              onscroll={handleScroll}
              onclick={handleLinkClick}
              onkeydown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  handleLinkClick(e as unknown as MouseEvent);
              }}
              tabindex="-1"
              style="outline: none; font-family: {settings.previewFont}, sans-serif; font-size: {settings.previewFontSize}px; flex: 1;"
            ></article>
            {#if tabManager.activeTabId && loadingTabs.includes(tabManager.activeTabId) && isAtBottom}
              <div
                class="loading-chip"
                transition:fly={{ y: 20, duration: 300, easing: cubicOut }}
              >
                <div class="loading-spinner"></div>
                <span>{t("common.loadingFullDocument", settings.language)}</span
                >
              </div>
            {/if}
          </div>
        </div>

        <!-- Unified TOC Support -->
        {#if isMarkdown && !showHome}
          <div
            class="top-fade-mask"
            style={settings.tocSide === "left"
              ? "left: 0;"
              : "right: 0; left: auto;"}
          ></div>
          {#if settings.showToc}
            <div
              transition:fly={{
                x: settings.tocSide === "left" ? -240 : 240,
                duration: 300,
                opacity: 1,
                easing: cubicOut,
              }}
              class="toc-overlay-wrapper"
              class:on-right={settings.tocSide === "right"}
            >
              <Toc
                {markdownBody}
                htmlContent={sanitizedHtml}
                onBeforeJump={pushScrollHistory}
                {collapsedHeaders}
                ontoggleFold={toggleFold}
                oncopyref={(text: string) => {
                  const tab = tabManager.activeTab;
                  const fn = tab?.path
                    ? tab.path
                        .split(/[/\\]/)
                        .pop()
                        ?.replace(/\.[^.]+$/, "") || ""
                    : "";
                  tauriCommands.writeClipboardText(
                    fn ? `[[${fn}#${text}]]` : `#${text}`,
                  );
                }}
                onjump={(id: string, text: string) => {
                  if (isEditing && editorPane) {
                    editorPane.revealHeader(text);
                  }
                }}
                oncontext={(e, item) => {
                  docContextMenu = {
                    show: true,
                    x: e.clientX,
                    y: e.clientY,
                    items: [
                      {
                        label: t("menu.copyReference", uiLanguage),
                        onClick: () => {
                          const tab = tabManager.activeTab;
                          const fn = tab?.path
                            ? tab.path
                                .split(/[/\\]/)
                                .pop()
                                ?.replace(/\.[^.]+$/, "") || ""
                            : "";
                          tauriCommands.writeClipboardText(
                            fn ? `[[${fn}#${item.text}]]` : `#${item.text}`,
                          );
                          docContextMenu.show = false;
                        },
                      },
                    ],
                  };
                }}
                onshowTooltip={(e, text, shortcut, align) => {
                  const rect = (
                    e.currentTarget as HTMLElement
                  ).getBoundingClientRect();
                  tooltip = {
                    show: true,
                    text,
                    shortcut: shortcut || "",
                    html: "",
                    isFootnote: false,
                    x:
                      align === "right"
                        ? rect.right + 8
                        : (align as any) === "left"
                          ? rect.left - 8
                          : rect.left + rect.width / 2,
                    y:
                      align === "right" || (align as any) === "left"
                        ? rect.top + rect.height / 2
                        : align === "below"
                          ? rect.bottom + 8
                          : rect.top - 8,
                    align: align || "top",
                  };
                }}
                onhideTooltip={() => (tooltip.show = false)}
              />
            </div>
          {/if}
        {/if}
      </div>
    </div>
  {:else}
    <HomePage
      {recentFiles}
      onselectFile={selectFile}
      onloadFile={loadMarkdown}
      onremoveRecentFile={removeRecentFile}
      onnewFile={handleNewFile}
    />
  {/if}

  <div
    class="tooltip align-{tooltip.align} {tooltip.show ? 'visible' : ''}"
    class:footnote-tooltip={tooltip.isFootnote}
    style="left: {tooltip.x}px; top: {tooltip.y}px;"
  >
    {#if tooltip.isFootnote}
      {@html tooltip.html}
    {:else}
      <span class="tooltip-text">{tooltip.text}</span>
      {#if tooltip.shortcut}
        <span class="tooltip-shortcut">{tooltip.shortcut}</span>
      {/if}
    {/if}
  </div>

  <Modal
    show={modalState.show}
    title={modalState.title}
    message={modalState.message}
    kind={modalState.kind}
    showSave={modalState.showSave}
    onconfirm={handleModalConfirm}
    onsave={handleModalSave}
    oncancel={handleModalCancel}
  />

  <div class="toast-container">
    {#each toasts as toast (toast.id)}
      <Toast
        message={toast.message}
        type={toast.type}
        onremove={() => (toasts = toasts.filter((t) => t.id !== toast.id))}
      />
    {/each}
  </div>

  {#if saveStatus !== "idle"}
    <div class="save-status {saveStatus}" role="status">
      {saveStatus === "saving"
        ? "Saving…"
        : saveStatus === "saved"
          ? "Saved"
          : saveStatus === "conflict"
            ? "External conflict"
            : "Save failed"}
    </div>
  {/if}

  {#if zoomData}
    <ZoomOverlay
      src={zoomData.src}
      html={zoomData.html}
      onclose={() => (zoomData = null)}
    />
  {/if}

  {#if isDragging}
    <div class="drag-overlay" role="presentation">
      <div class="drag-zones" class:split={isSplit}>
        {#if isSplit || isEditing}
          <div
            class="drag-zone editor-zone"
            class:active={dragTarget === "editor"}
          >
            <div class="drag-message">
              <span>{t("dragAndDrop.embed")}</span>
            </div>
          </div>
        {/if}
        {#if isSplit || !isEditing}
          <div
            class="drag-zone viewer-zone"
            class:active={dragTarget === "preview"}
          >
            <div class="drag-message">
              <span>{t("dragAndDrop.open")}</span>
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}
{/if}

<ContextMenu {...docContextMenu} onhide={() => (docContextMenu.show = false)} />

<style>
  :root {
    --animation: cubic-bezier(0.05, 0.95, 0.05, 0.95);
    scroll-behavior: smooth !important;
    background-color: var(--color-canvas-default);
  }

  :global(body) {
    background-color: var(--color-canvas-default);
    margin: 0;
    padding: 0;
    color: var(--color-fg-default);
    overflow: hidden;
  }

  .markdown-body {
    box-sizing: border-box;
    min-width: 200px;
    margin: 0 auto;
    padding: 50px clamp(24px, 5vw, 50px);
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    transform: translate3d(0, 0, 0);
    max-width: 880px;
    text-align: left;
    overflow-wrap: anywhere;
  }

  .save-status {
    position: fixed;
    right: 16px;
    bottom: 14px;
    z-index: 1200;
    padding: 5px 9px;
    border: 1px solid var(--color-border-muted);
    border-radius: 999px;
    background: var(--color-canvas-overlay);
    color: var(--color-fg-muted);
    font: 12px var(--win-font);
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
  }

  .save-status.error,
  .save-status.conflict {
    color: var(--color-danger-fg);
  }

  .loading-chip {
    position: absolute;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--color-canvas-overlay);
    border: 1px solid var(--color-border-default);
    border-radius: 20px;
    padding: 8px 16px;
    display: flex;
    align-items: center;
    gap: 10px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 100;
    color: var(--color-fg-muted);
    font-size: 13px;
    font-family: var(--win-font), sans-serif;
  }

  .loading-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid var(--color-border-muted);
    border-top-color: var(--color-accent-fg);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media print {
    .markdown-body {
      height: auto !important;
      overflow: visible !important;
      padding: 0 !important;
    }
  }

  .markdown-container :global(.markdown-body pre),
  .markdown-container :global(.markdown-body pre code),
  .markdown-container :global(.markdown-body pre tt),
  .markdown-container :global(.markdown-body code) {
    font-family: var(--code-font, Consolas, monospace) !important;
    font-size: var(--code-font-size, 14px) !important;
  }

  .markdown-body.full-width {
    max-width: 100%;
    margin: 0;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  :global(.video-container) {
    position: relative;
    padding-bottom: 56.25%;
    height: 0;
    overflow: hidden;
    max-width: 100%;
    margin: 1em 0;
  }

  :global(.video-container iframe) {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 8px;
  }

  :global(.mermaid-diagram) {
    margin: 1em 0;
    display: flex;
    justify-content: center;
    overflow-x: auto;
  }

  :global(.mermaid-diagram svg) {
    max-width: 100%;
    height: auto;
  }

  .tooltip {
    position: fixed;
    background: var(--color-canvas-overlay);
    color: var(--color-fg-default);
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 11px;
    pointer-events: none;
    z-index: 10007;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    border: 1px solid var(--color-border-default);
    font-family: var(--win-font), "Segoe UI", sans-serif;
    white-space: nowrap;
    max-width: 400px;
    overflow: hidden;
    text-overflow: ellipsis;
    transform: translateX(-50%) translateY(calc(-100% + 4px));
    opacity: 0;
    transition:
      opacity 0.15s ease,
      transform 0.15s ease,
      left 0.15s ease,
      top 0.15s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .tooltip.visible {
    opacity: 1;
    transform: translateX(-50%) translateY(-100%);
  }

  .tooltip.align-below {
    transform: translateX(-50%) translateY(-4px);
  }

  .tooltip.align-below.visible {
    transform: translateX(-50%) translateY(0);
  }

  .tooltip-text {
    display: block;
  }

  .tooltip-shortcut {
    color: var(--color-fg-muted);
    font-size: 10px;
    font-family: inherit;
  }

  .tooltip.align-right {
    transform: translateX(4px) translateY(-50%);
  }

  .tooltip.align-right.visible {
    transform: translateX(0) translateY(-50%);
    align-items: flex-start;
  }

  .tooltip.align-left {
    transform: translateX(calc(-100% - 4px)) translateY(-50%);
  }

  .tooltip.align-left.visible {
    transform: translateX(-100%) translateY(-50%);
    align-items: flex-end;
  }

  .tooltip.footnote-tooltip {
    white-space: normal;
    max-width: 500px;
    text-align: left;
    line-height: 1.5;
    padding: 10px 14px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    transform: translate(-50%, calc(-100% + 4px));
    margin-top: -8px;
    display: block; /* reset flex for footnotes */
  }

  .tooltip.footnote-tooltip.visible {
    transform: translate(-50%, -100%);
  }

  :global(.tooltip.footnote-tooltip p) {
    margin: 0;
    padding: 0;
  }

  :global(.tooltip.footnote-tooltip p + p) {
    margin-top: 8px;
  }

  .tooltip.footnote-tooltip::after {
    content: "";
    position: absolute;
    bottom: -6px;
    left: 50%;
    transform: translateX(-50%);
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 6px solid var(--color-canvas-overlay);
  }

  .drag-overlay {
    position: fixed;
    top: 36px;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 40000;
    animation: fadeIn 0.1s ease-out;
  }

  .drag-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    color: #ffffff;
    font-family: var(--win-font);
    font-weight: 500;
    font-size: 13px;
    position: absolute;
    bottom: 40px;
    left: 50%;
    transform: translateX(-50%);
    white-space: nowrap;
    background: var(--color-accent-fg);
    padding: 6px 14px;
    border-radius: 20px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    pointer-events: none;
  }

  .drag-zones {
    display: flex;
    width: 100%;
    height: 100%;
    gap: 12px;
  }

  .drag-zone {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    transition:
      background 0.2s,
      border-color 0.2s,
      opacity 0.2s;
    border: 2px dashed transparent;
    opacity: 0;
    position: relative;
    margin: 8px;
    border-radius: 12px;
  }

  .drag-zone.active {
    background: color-mix(in srgb, var(--color-accent-fg) 8%, transparent);
    border-color: color-mix(in srgb, var(--color-accent-fg) 30%, transparent);
    opacity: 1;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.98);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .loading-screen {
    position: fixed;
    top: 36px;
    left: 0;
    width: 100%;
    height: calc(100% - 36px);
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-canvas-default);
    z-index: 5000;
  }

  .spinner {
    animation: rotate 2s linear infinite;
    z-index: 2;
    width: 50px;
    height: 50px;
  }

  .spinner .path {
    stroke: var(--color-accent-fg);
    stroke-linecap: round;
    animation: dash 1.5s ease-in-out infinite;
  }

  @keyframes rotate {
    100% {
      transform: rotate(360deg);
    }
  }

  @keyframes dash {
    0% {
      stroke-dasharray: 1, 150;
      stroke-dashoffset: 0;
    }
    50% {
      stroke-dasharray: 90, 150;
      stroke-dashoffset: -35;
    }
    100% {
      stroke-dasharray: 90, 150;
      stroke-dashoffset: -124;
    }
  }
  /* Layout System */
  .layout-container {
    display: flex;
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
    padding-top: 36px;
    box-sizing: border-box;
    overflow: hidden;
  }

  .pane {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition:
      flex 0.3s cubic-bezier(0.16, 1, 0.3, 1),
      transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    min-width: 0;
  }

  .pane.editor-pane {
    background: var(--color-canvas-default);
  }

  .layout-container.split .editor-pane.markdown-toolbar-pane {
    min-width: min(400px, calc(100% - 80px));
  }

  .pane.viewer-pane {
    background: var(--color-canvas-default);
  }

  .viewer-content {
    display: flex;
    flex-direction: row;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  /* View Mode */
  .layout-container:not(.split):not(.editing) .editor-pane {
    width: 0 !important;
    flex: 0 !important;
    opacity: 0;
  }

  .layout-container:not(.split):not(.editing) .viewer-pane {
    width: 100%;
    flex: 1 !important;
  }

  /* Edit Mode */
  .layout-container:not(.split).editing .editor-pane {
    width: 100%;
    flex: 1 !important;
  }

  .layout-container:not(.split).editing .viewer-pane {
    width: 0 !important;
    flex: 0 !important;
    opacity: 0;
  }

  /* Split Mode Transition Logic */
  /* Editor slides in from left */
  /* Viewer slides right */

  .pane {
    height: 100%;
    position: relative;
  }

  .split-bar {
    width: 4px;
    background: linear-gradient(
      to right,
      transparent 0,
      transparent 1px,
      var(--color-border-default) 1px,
      var(--color-border-default) 2px,
      transparent 2px
    );
    cursor: col-resize;
    position: relative;
    z-index: 100;
    transition: background 0.2s;
  }

  .split-bar:hover {
    background: linear-gradient(
      to right,
      transparent 0,
      transparent 4px,
      var(--color-accent-fg) 1px,
      var(--color-accent-fg) 2px,
      transparent 2px
    );
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .toast-container {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 50000;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    pointer-events: none;
  }
  .top-fade-mask {
    position: absolute;
    top: 0;
    left: 0;
    width: 60px;
    height: 52px;
    background: linear-gradient(
      to bottom,
      var(--color-canvas-default) 40%,
      transparent 100%
    );
    pointer-events: none;
    z-index: 50;
  }

  .toc-overlay-wrapper {
    position: absolute;
    top: 36px;
    left: 40px;
    bottom: 0;
    z-index: 1000;
    height: calc(100% - 36px);
    background-color: var(--color-canvas-default);
    border-right: 1px solid transparent;
    border-left: 1px solid transparent;
    box-shadow: 10px 0 30px rgba(0, 0, 0, 0);
    transition:
      box-shadow 0.3s ease,
      border-color 0.3s ease,
      left 0.3s ease,
      right 0.3s ease;
    order: -1;
  }

  .editor-pane {
    transition: padding 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .editor-shell {
    display: flex;
    flex: 1;
    min-width: 0;
    min-height: 0;
  }

  .editor-surface {
    display: flex;
    flex: 1;
    min-width: 0;
    min-height: 0;
    height: 100%;
  }

  .toc-rail {
    width: 48px;
    position: absolute;
    top: 36px;
    bottom: 0;
    left: 0;
    z-index: 1100;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    padding: 8px 0 0 7px;
    justify-content: flex-start;
    background: linear-gradient(
      to right,
      color-mix(in srgb, var(--color-canvas-default) 96%, transparent),
      color-mix(in srgb, var(--color-canvas-default) 84%, transparent)
    );
    border-right: 1px solid var(--color-border-muted);
    box-sizing: border-box;
  }

  .toc-rail.on-right {
    left: auto;
    right: 0;
    align-items: flex-end;
    padding: 8px 7px 0 0;
    background: linear-gradient(
      to left,
      color-mix(in srgb, var(--color-canvas-default) 96%, transparent),
      color-mix(in srgb, var(--color-canvas-default) 84%, transparent)
    );
    border-right: none;
    border-left: 1px solid var(--color-border-muted);
  }

  .toc-rail-button {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    color: var(--color-fg-muted);
    cursor: pointer;
    padding: 0;
    opacity: 0.75;
    transition:
      background-color 0.2s ease,
      color 0.2s ease,
      opacity 0.2s ease,
      border-color 0.2s ease;
  }

  .toc-rail-button svg {
    width: 16px;
    height: 16px;
  }

  .toc-rail-button:hover {
    opacity: 1;
    background-color: var(--color-canvas-subtle);
    color: var(--color-fg-default);
    border-color: var(--color-border-muted);
  }

  .toc-rail-button.active {
    opacity: 1;
    background: color-mix(in srgb, var(--color-accent-fg) 14%, transparent);
    color: var(--color-accent-fg);
    border-color: color-mix(in srgb, var(--color-accent-fg) 42%, transparent);
    box-shadow: inset 0 0 0 1px
      color-mix(in srgb, var(--color-accent-fg) 18%, transparent);
  }

  .toc-rail-button:disabled {
    opacity: 0.3;
    cursor: default;
    background: transparent;
    border-color: transparent;
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

  .toc-overlay-wrapper.on-right {
    left: auto;
    right: 40px;
    order: 2;
  }

  .layout-container {
    transition: padding 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .layout-container.toc-on-left {
    padding-left: 40px;
  }

  .layout-container.toc-on-right {
    padding-right: 40px;
  }

  .layout-container.has-open-toc.toc-on-left {
    padding-left: 280px;
  }

  .layout-container.has-open-toc.toc-on-right {
    padding-right: 280px;
  }

  .zen-mode-shell {
    position: absolute;
    inset: 36px 0 0;
    display: flex;
    min-width: 0;
  }

  .zen-mode-shell.rail-on-left {
    padding-left: 48px;
  }

  .zen-mode-shell.rail-on-right {
    padding-right: 48px;
  }

  .zen-mode-shell .zen-rail {
    top: 0;
    z-index: 1200;
  }

  .toc-overlay-wrapper {
    width: 240px;
    box-shadow: none;
  }

  .toc-overlay-wrapper:not(.on-right) {
    border-right-color: var(--color-border-default);
  }

  .toc-overlay-wrapper.on-right {
    border-left-color: var(--color-border-default);
  }
</style>
