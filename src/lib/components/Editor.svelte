<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import MarkdownToolbar from "./MarkdownToolbar.svelte";
  import { tabManager } from "../stores/tabs.svelte.js";
  import { settings } from "../stores/settings.svelte.js";
  import { t } from "../utils/i18n.js";
  import type { MarkdownToolbarAction } from "../utils/markdown-toolbar.js";
  import { jsonUtils } from "../utils/json.js";

  import * as monaco from "monaco-editor/esm/vs/editor/editor.api.js";
  import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
  import "monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution";
  import "monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution";
  import "monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution";
  import "monaco-editor/esm/vs/basic-languages/html/html.contribution";
  import "monaco-editor/esm/vs/basic-languages/css/css.contribution";
  import "monaco-editor/esm/vs/basic-languages/python/python.contribution";
  import "monaco-editor/esm/vs/basic-languages/rust/rust.contribution";
  import "monaco-editor/esm/vs/basic-languages/shell/shell.contribution";
  import "monaco-editor/esm/vs/basic-languages/sql/sql.contribution";
  import "monaco-editor/esm/vs/basic-languages/java/java.contribution";
  import "monaco-editor/esm/vs/basic-languages/cpp/cpp.contribution";
  import "monaco-editor/esm/vs/basic-languages/csharp/csharp.contribution";
  import "monaco-editor/esm/vs/basic-languages/xml/xml.contribution";
  import "monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution";
  import { openUrl } from "@tauri-apps/plugin-opener";
  import { tauriCommands } from "../api/tauri.js";

  let {
    value = $bindable(),
    language = "markdown",
    onsave,
    onnew,
    onopen,
    onclose,
    onreveal,
    ontoggleEdit,
    ontoggleLive,
    onhome,
    onnextTab,
    onprevTab,
    onundoClose,
    ontoast,
    zoomLevel = $bindable(100),
    theme = "system",
    plainTextMode = false,
  } = $props<{
    value: string;
    language?: string;
    onsave?: () => void;
    onnew?: () => void;
    onopen?: () => void;
    onclose?: () => void;
    onreveal?: () => void;
    ontoggleEdit?: () => void;
    ontoggleLive?: () => void;
    onhome?: () => void;
    onnextTab?: () => void;
    onprevTab?: () => void;
    onundoClose?: () => void;
    ontoast?: (message: string, type: "info" | "error" | "warning") => void;
    zoomLevel?: number;
    isSplit?: boolean;
    theme?: string;
    plainTextMode?: boolean;
  }>();

  let isMarkdownLanguage = $derived(language === "markdown");
  let isTextLanguage = $derived(plainTextMode || language === "plaintext");
  let isCodeLikeLanguage = $derived(
    !plainTextMode && !isMarkdownLanguage && language !== "plaintext",
  );
  let effectiveMinimap = $derived(isCodeLikeLanguage && settings.minimap);
  let effectiveWordWrap = $derived(
    isMarkdownLanguage
      ? settings.wordWrap
      : isTextLanguage
        ? settings.textWordWrap
        : "off",
  );
  let effectiveWordWrapColumn = $derived(
    isTextLanguage ? settings.textMaxWidth : settings.editorMaxWidth,
  );
  let effectiveRenderWhitespace = $derived(
    isCodeLikeLanguage && settings.showWhitespace
      ? ("trailing" as const)
      : ("none" as const),
  );
  let effectiveLineNumbers = $derived(
    plainTextMode ? "off" : settings.lineNumbers,
  );
  let effectiveFontFamily = $derived(
    plainTextMode ? settings.previewFont : settings.editorFont,
  );

  let container: HTMLDivElement;
  let editor: monaco.editor.IStandaloneCodeEditor;
  let isApplyingExternalScroll = false;
  const managedImages: {
    embed: string;
    filename: string;
    parentDir: string;
  }[] = $state([]);

  let cursorPosition = $state<monaco.Position | null>(null);
  let selectionCount = $state(0);
  let cursorCount = $state(0);
  let wordCount = $state(0);
  let currentLanguage = $state("markdown");
  let currentTabId = tabManager.activeTabId;
  let uiLanguage = $state(settings.language);
  let jsonValidationTimer: number | undefined;
  let lastJsonValidationMessage = $state("");

  function clearJsonValidationMarkers(model?: monaco.editor.ITextModel | null) {
    const target = model || editor?.getModel();
    if (!target) return;
    monaco.editor.setModelMarkers(target, "jsonValidation", []);
  }

  function scheduleJsonValidation() {
    const model = editor?.getModel();
    if (!model || model.getLanguageId() !== "json") {
      clearJsonValidationMarkers(model);
      lastJsonValidationMessage = "";
      return;
    }

    if (jsonValidationTimer) {
      clearTimeout(jsonValidationTimer);
    }

    jsonValidationTimer = window.setTimeout(async () => {
      const content = model.getValue();
      if (!content.trim()) {
        clearJsonValidationMarkers(model);
        lastJsonValidationMessage = "";
        return;
      }

      try {
        const result = await jsonUtils.validate(content);
        if (result.valid) {
          clearJsonValidationMarkers(model);
          lastJsonValidationMessage = "";
          return;
        }

        const error = result.error;
        if (!error) {
          clearJsonValidationMarkers(model);
          lastJsonValidationMessage = "";
          return;
        }

        const line = Math.max(1, error.line);
        const column = Math.max(1, error.column);
        const marker: monaco.editor.IMarkerData = {
          severity: monaco.MarkerSeverity.Error,
          message: error.message,
          startLineNumber: line,
          startColumn: column,
          endLineNumber: line,
          endColumn: Math.min(column + 1, model.getLineMaxColumn(line)),
        };
        monaco.editor.setModelMarkers(model, "jsonValidation", [marker]);
        const message = `JSON: ${error.message} (line ${line}, col ${column})`;
        if (message !== lastJsonValidationMessage) {
          ontoast?.(message, "error");
          lastJsonValidationMessage = message;
        }
      } catch (validationError) {
        clearJsonValidationMarkers(model);
        ontoast?.(
          `JSON validation failed: ${String(validationError)}`,
          "error",
        );
      }
    }, 500);
  }

  function applyMarkdownToolbarAction(action: MarkdownToolbarAction) {
    if (!editor) return;

    const model = editor.getModel();
    const selection = editor.getSelection();
    if (!model || !selection) return;

    const selectedText = model.getValueInRange(selection);
    const isEmpty = selection.isEmpty();
    let editRange: monaco.IRange = selection;
    let replacement = "";
    let placeholderOffset: { start: number; length: number } | null = null;

    const setWrappedText = (before: string, after = before) => {
      const content = isEmpty ? "texto" : selectedText;
      replacement = `${before}${content}${after}`;
      placeholderOffset = {
        start: before.length,
        length: content.length,
      };
    };

    const getLineRange = () => {
      const startLine = selection.startLineNumber;
      const endLine =
        selection.endColumn === 1 && selection.endLineNumber > startLine
          ? selection.endLineNumber - 1
          : selection.endLineNumber;

      return {
        startLine,
        endLine,
        range: new monaco.Range(
          startLine,
          1,
          endLine,
          model.getLineMaxColumn(endLine),
        ),
      };
    };

    const transformLines = (
      transform: (line: string, index: number) => string,
    ) => {
      const { range } = getLineRange();
      editRange = range;
      replacement = model
        .getValueInRange(range)
        .split("\n")
        .map(transform)
        .join("\n");
    };

    switch (action) {
      case "heading": {
        const { range } = getLineRange();
        editRange = range;
        replacement = model
          .getValueInRange(range)
          .split("\n")
          .map((line) => {
            const heading = line.match(/^\s{0,3}(#{1,6})\s+(.*)$/);
            const currentLevel = heading?.[1].length ?? 0;
            const content = heading?.[2] ?? line;
            const nextLevel =
              currentLevel === 3
                ? 2
                : currentLevel === 2
                  ? 1
                  : currentLevel === 1
                    ? 0
                    : 3;

            if (nextLevel === 0) return content;

            return `${"#".repeat(nextLevel)} ${content || "Título"}`;
          })
          .join("\n");

        if (
          isEmpty &&
          model.getLineContent(selection.startLineNumber).trim() === ""
        ) {
          placeholderOffset = {
            start: 4,
            length: "Título".length,
          };
        }
        break;
      }
      case "bold":
        setWrappedText("**");
        break;
      case "italic":
        setWrappedText("*");
        break;
      case "inline-code":
        setWrappedText("`");
        break;
      case "code-block": {
        const content = isEmpty ? "texto" : selectedText;
        replacement = `\`\`\`\n${content}\n\`\`\``;
        placeholderOffset = {
          start: 4,
          length: content.length,
        };
        break;
      }
      case "quote":
        transformLines(
          (line) => `> ${line.replace(/^\s*>\s?/, "") || "texto"}`,
        );
        if (
          isEmpty &&
          model.getLineContent(selection.startLineNumber).trim() === ""
        ) {
          placeholderOffset = { start: 2, length: "texto".length };
        }
        break;
      case "unordered-list":
        transformLines(
          (line) => `- ${line.replace(/^\s*[-+*]\s+/, "") || "texto"}`,
        );
        if (
          isEmpty &&
          model.getLineContent(selection.startLineNumber).trim() === ""
        ) {
          placeholderOffset = { start: 2, length: "texto".length };
        }
        break;
      case "ordered-list":
        transformLines(
          (line, index) =>
            `${index + 1}. ${line.replace(/^\s*\d+[.)]\s+/, "") || "texto"}`,
        );
        if (
          isEmpty &&
          model.getLineContent(selection.startLineNumber).trim() === ""
        ) {
          placeholderOffset = { start: 3, length: "texto".length };
        }
        break;
      case "link": {
        const content = isEmpty ? "texto" : selectedText;
        replacement = `[${content}](link)`;
        placeholderOffset = isEmpty
          ? { start: 1, length: content.length }
          : { start: content.length + 3, length: "link".length };
        break;
      }
      case "table":
        replacement =
          "| Coluna 1 | Coluna 2 | Coluna 3 |\n" +
          "| --- | --- | --- |\n" +
          "| texto | texto | texto |";
        placeholderOffset = {
          start: replacement.indexOf("texto"),
          length: "texto".length,
        };
        break;
      case "horizontal-rule":
        replacement = "---";
        break;
    }

    const startOffset = model.getOffsetAt({
      lineNumber: editRange.startLineNumber,
      column: editRange.startColumn,
    });

    editor.pushUndoStop();
    editor.executeEdits("markdown-toolbar", [
      {
        range: editRange,
        text: replacement,
        forceMoveMarkers: true,
      },
    ]);

    if (placeholderOffset) {
      const placeholderStart = model.getPositionAt(
        startOffset + placeholderOffset.start,
      );
      const placeholderEnd = model.getPositionAt(
        startOffset + placeholderOffset.start + placeholderOffset.length,
      );
      editor.setSelection(
        new monaco.Selection(
          placeholderStart.lineNumber,
          placeholderStart.column,
          placeholderEnd.lineNumber,
          placeholderEnd.column,
        ),
      );
    } else {
      const endPosition = model.getPositionAt(startOffset + replacement.length);
      editor.setPosition(endPosition);
    }

    editor.pushUndoStop();
    editor.focus();

    if (editor.getModel()?.getLanguageId() === "json") {
      scheduleJsonValidation();
    }
  }

  $effect(() => {
    uiLanguage = settings.language;
  });

  self.MonacoEnvironment = {
    getWorker: function () {
      return new editorWorker();
    },
  };

  onMount(() => {
    const originalOpen = window.open;
    window.open = function (
      url?: string | URL,
      target?: string,
      features?: string,
    ) {
      if (
        typeof url === "string" &&
        (url.startsWith("http://") || url.startsWith("https://"))
      ) {
        openUrl(url);
        return null;
      }
      return originalOpen.apply(this, arguments as any);
    };

    const defineThemes = () => {
      monaco.editor.defineTheme("app-theme-dark", {
        base: "vs-dark",
        inherit: true,
        rules: [],
        colors: {
          "editor.background": "#181818",
          "menu.background": "#181818",
          "menu.foreground": "#cccccc",
          "menu.selectionBackground": "#2a2d2e",
          "menu.selectionForeground": "#ffffff",
          "menu.separatorBackground": "#454545",
          "editorWidget.background": "#181818",
          "editorWidget.border": "#454545",
        },
      });

      monaco.editor.defineTheme("app-theme-light", {
        base: "vs",
        inherit: true,
        rules: [],
        colors: {
          "editor.background": "#FDFDFD",
          "menu.background": "#FDFDFD",
          "menu.foreground": "#333333",
          "menu.selectionBackground": "#eeeeee",
          "menu.selectionForeground": "#000000",
          "menu.separatorBackground": "#cccccc",
          "editorWidget.background": "#FDFDFD",
          "editorWidget.border": "#cccccc",
        },
      });
    };

    defineThemes();

    const getTheme = () => {
      return theme === "dark" ? "app-theme-dark" : "app-theme-light";
    };

    editor = monaco.editor.create(container, {
      value: value,
      language: language,
      theme: getTheme(),
      dragAndDrop: true,
      automaticLayout: true,
      minimap: { enabled: effectiveMinimap },
      scrollBeyondLastLine: true,
      wordWrap: effectiveWordWrap as
        | "on"
        | "off"
        | "wordWrapColumn"
        | "bounded",
      wordWrapColumn: effectiveWordWrapColumn,
      lineNumbers: effectiveLineNumbers as
        | "on"
        | "off"
        | "relative"
        | "interval",
      renderLineHighlight: settings.renderLineHighlight ? "line" : "none",
      occurrencesHighlight: settings.occurrencesHighlight
        ? "singleFile"
        : "off",
      overviewRulerLanes: 0,
      overviewRulerBorder: false,
      hideCursorInOverviewRuler: true,
      fontSize: settings.editorFontSize,
      fontFamily: effectiveFontFamily,
      wordBasedSuggestions: "off",
      quickSuggestions: false,
      renderWhitespace: effectiveRenderWhitespace,
      padding: { top: 20 },
      scrollbar: {
        vertical: "visible",
        horizontal: "visible",
        useShadows: false,
        verticalHasArrows: false,
        horizontalHasArrows: false,
        arrowSize: 0,
        verticalScrollbarSize: 6,
        horizontalScrollbarSize: 6,
        verticalSliderSize: 3,
        horizontalSliderSize: 3,
      },
    });

    if (tabManager.activeTab?.editorViewState) {
      editor.restoreViewState(tabManager.activeTab.editorViewState);
    } else if (tabManager.activeTab) {
      let scrolled = false;
      if (tabManager.activeTab.anchorLine > 0) {
        editor.revealLineNearTop(
          Math.max(1, tabManager.activeTab.anchorLine - 2),
          monaco.editor.ScrollType.Immediate,
        );
        scrolled = true;
      }

      if (!scrolled) {
        const scrollHeight = editor.getScrollHeight();
        const clientHeight = editor.getLayoutInfo().height;
        if (scrollHeight > clientHeight) {
          const targetScroll =
            tabManager.activeTab.scrollPercentage *
            (scrollHeight - clientHeight);
          editor.setScrollTop(targetScroll);
        }
      }
    }

    editor.addAction({
      id: "toggle-minimap",
      label: t("settings.minimap", uiLanguage),
      run: () => {
        settings.toggleMinimap();
      },
    });

    editor.addAction({
      id: "toggle-word-wrap",
      label: t("settings.wordWrap", uiLanguage),
      run: () => {
        settings.toggleWordWrap();
      },
    });

    editor.addAction({
      id: "toggle-line-numbers",
      label: t("settings.lineNumbers", uiLanguage),
      run: () => {
        settings.toggleLineNumbers();
      },
    });

    editor.addAction({
      id: "toggle-status-bar",
      label: t("settings.statusBar", uiLanguage),
      run: () => {
        settings.toggleStatusBar();
      },
    });

    editor.addAction({
      id: "toggle-word-count",
      label: t("settings.wordCount", uiLanguage),
      run: () => {
        settings.toggleWordCount();
      },
    });

    editor.addAction({
      id: "toggle-line-highlight",
      label: t("settings.lineHighlight", uiLanguage),
      run: () => {
        settings.toggleLineHighlight();
      },
    });

    editor.addAction({
      id: "toggle-occurrences-highlight",
      label: t("settings.showWhitespace", uiLanguage),
      run: () => {
        settings.toggleOccurrencesHighlight();
      },
    });

    editor.addAction({
      id: "toggle-whitespace",
      label: t("settings.showWhitespace", uiLanguage),
      run: () => {
        settings.toggleShowWhitespace();
      },
    });

    editor.addAction({
      id: "toggle-tabs",
      label: t("settings.showTabs", uiLanguage),
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyB,
      ],
      run: () => {
        settings.toggleTabs();
      },
    });


    const updateTheme = () => {
      monaco.editor.setTheme(getTheme());
    };

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", updateTheme);

    editor.focus();

    editor.onDidChangeModelContent(() => {
      const newValue = editor.getValue();
      if (value !== newValue) {
        value = newValue;
        if (tabManager.activeTabId) {
          tabManager.updateTabRawContent(tabManager.activeTabId, newValue);
        }
      }

      const model = editor.getModel();
      if (model) {
        const text = model.getValue();
        wordCount = (text.match(/\S+/g) || []).filter((w) =>
          /\w/.test(w),
        ).length;
      }
    });

    editor.onDidChangeCursorPosition((e) => {
      cursorPosition = e.position;
    });

    editor.onDidChangeCursorSelection((e) => {
      const selections = editor.getSelections() || [];
      cursorCount = selections.length;
      const model = editor.getModel();

      if (model && selections.length > 0) {
        selectionCount = selections.reduce(
          (acc: number, selection: monaco.Selection) => {
            return acc + model.getValueInRange(selection).length;
          },
          0,
        );
      } else {
        selectionCount = 0;
      }
    });

    if (editor.getModel()) {
      currentLanguage = editor.getModel()?.getLanguageId() || "markdown";
      const text = editor.getModel()?.getValue() || "";
      wordCount = (text.match(/\S+/g) || []).filter((w) => /\w/.test(w)).length;
    }

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (onsave) onsave();
    });

    const insertTextAtCursor = (text: string) => {
      const selection = editor.getSelection();
      if (!selection) return;
      const op = { range: selection, text: text, forceMoveMarkers: true };
      editor.executeEdits("my-source", [op]);
    };

    const toggleFormat = (
      marker: string,
      type: "wrap" | "block" | "tag" = "wrap",
    ) => {
      const selection = editor.getSelection();
      if (!selection) return;

      const model = editor.getModel();
      if (!model) return;

      const text = model.getValueInRange(selection);

      if (type === "wrap") {
        if (text.startsWith(marker) && text.endsWith(marker)) {
          const newText = text.slice(marker.length, -marker.length);
          editor.executeEdits("toggle-format", [
            { range: selection, text: newText },
          ]);
        } else {
          editor.executeEdits("toggle-format", [
            { range: selection, text: `${marker}${text}${marker}` },
          ]);
        }
      } else if (type === "tag") {
        const [startTag, endTag] = marker.split("|");
        if (text.startsWith(startTag) && text.endsWith(endTag)) {
          const newText = text.slice(startTag.length, -endTag.length);
          editor.executeEdits("toggle-format", [
            { range: selection, text: newText },
          ]);
        } else {
          editor.executeEdits("toggle-format", [
            { range: selection, text: `${startTag}${text}${endTag}` },
          ]);
        }
      }
    };

    editor.addAction({
      id: "fmt-bold",
      label: t("menu.bold", uiLanguage),
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB],
      run: () => toggleFormat("**"),
    });

    editor.addAction({
      id: "fmt-italic",
      label: t("menu.italic", uiLanguage),
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI],
      run: () => toggleFormat("*"),
    });

    editor.addAction({
      id: "fmt-underline",
      label: t("menu.underline", uiLanguage),
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyU],
      run: () => toggleFormat("<u>|</u>", "tag"),
    });

    editor.addAction({
      id: "insert-table-simple",
      label: t("menu.insertTable", uiLanguage),
      keybindings: [
        monaco.KeyMod.chord(
          monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK,
          monaco.KeyCode.KeyT,
        ),
      ],
      run: () => {
        const selection = editor.getSelection();
        if (!selection) return;

        const cols = 3;
        const rows = 2;
        let table = "\n";
        table += "| " + Array(cols).fill("Header").join(" | ") + " |\n";
        table += "| " + Array(cols).fill("---").join(" | ") + " |\n";
        for (let i = 0; i < rows; i++) {
          table += "| " + Array(cols).fill("Cell").join(" | ") + " |\n";
        }
        table += "\n";

        editor.executeEdits("insert-table", [
          {
            range: selection,
            text: table,
            forceMoveMarkers: true,
          },
        ]);
      },
    });

    editor.addAction({
      id: "file-new",
      label: t("menu.newFile", uiLanguage),
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyN,
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyT,
      ],
      run: () => onnew?.(),
    });

    editor.addAction({
      id: "file-open",
      label: t("menu.openFile", uiLanguage),
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyO],
      run: () => onopen?.(),
    });

    editor.addAction({
      id: "file-save",
      label: t("menu.save", uiLanguage),
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: () => onsave?.(),
    });

    editor.addAction({
      id: "file-close",
      label: t("menu.closeFile", uiLanguage),
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyW],
      run: () => onclose?.(),
    });

    editor.addAction({
      id: "file-reveal",
      label: t("menu.openLocation", uiLanguage),
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyR,
      ],
      run: () => onreveal?.(),
    });

    editor.addAction({
      id: "view-toggle-edit",
      label: t("menu.toggleEditMode", uiLanguage),
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyE],
      run: () => ontoggleEdit?.(),
    });

    editor.addAction({
      id: "view-toggle-live",
      label: t("menu.toggleLiveMode", uiLanguage),
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyL],
      run: () => ontoggleLive?.(),
    });

    editor.addAction({
      id: "tab-next",
      label: t("menu.nextTab", uiLanguage),
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Tab],
      run: () => onnextTab?.(),
    });

    editor.addAction({
      id: "tab-prev",
      label: t("menu.previousTab", uiLanguage),
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Tab,
      ],
      run: () => onprevTab?.(),
    });

    editor.addAction({
      id: "tab-undo-close",
      label: t("menu.undoCloseTab", uiLanguage),
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyT,
      ],
      run: () => onundoClose?.(),
    });

    editor.addAction({
      id: "app-command-palette",
      label: t("menu.commandPalette", uiLanguage),
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyP],
      run: (ed) => {
        ed.trigger("keyboard", "editor.action.quickCommand", {});
      },
    });

    // JSON utilities
    editor.addAction({
      id: "json-format",
      label: "Format JSON",
      keybindings: [
        monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF,
      ],
      contextMenuOrder: 1,
      contextMenuGroupId: "1_modification",
      precondition: "editorLangId == json",
      run: async () => {
        const content = editor.getValue();
        try {
          const formatted = await jsonUtils.format(content);
          editor.setValue(formatted);
          ontoast?.("JSON formatted", "info");
        } catch (e) {
          ontoast?.(String(e), "error");
        }
      },
    });

    editor.addAction({
      id: "json-minify",
      label: "Minify JSON",
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyM,
      ],
      contextMenuOrder: 2,
      contextMenuGroupId: "1_modification",
      precondition: "editorLangId == json",
      run: async () => {
        const content = editor.getValue();
        try {
          const minified = await jsonUtils.minify(content);
          editor.setValue(minified);
          ontoast?.("JSON minified", "info");
        } catch (e) {
          ontoast?.(String(e), "error");
        }
      },
    });

    const wheelListener = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        if (e.deltaY < 0) {
          zoomLevel = Math.min(zoomLevel + 10, 500);
        } else {
          zoomLevel = Math.max(zoomLevel - 10, 25);
        }
      }
    };

    container.addEventListener("wheel", wheelListener, { capture: true });

    const contentChangeListener = editor.onDidChangeModelContent((e) => {
      if (e.isUndoing && managedImages.length > 0) {
        const currentContent = editor.getValue();
        const last = managedImages[managedImages.length - 1];
        if (!currentContent.includes(last.embed)) {
          managedImages.pop();
          const imgDirName = settings.imageDirectory || "img";
          const imgPath = `${last.parentDir}/${imgDirName}/${last.filename}`;
          tauriCommands
            .deleteFile(imgPath)
            .then(() => {
              tauriCommands.cleanupEmptyImageDirectory(
                last.parentDir,
                imgDirName,
              );
            })
            .catch(console.error);
        }
      }

      scheduleJsonValidation();
    });

    const completionProvider = monaco.languages.registerCompletionItemProvider(
      "markdown",
      {
        triggerCharacters: ["(", "/", "\\", '"'],
        provideCompletionItems: async (model, position) => {
          const lineContent = model.getLineContent(position.lineNumber);
          const prefix = lineContent.substring(0, position.column - 1);

          const isEmbedContext = /(!?\[.*\]\(|<img.*src=["']|src=["'])$/.test(
            prefix,
          );
          if (!isEmbedContext) return { suggestions: [] };

          const tab = tabManager.activeTab;
          if (!tab?.path) return { suggestions: [] };

          const lastSlash = Math.max(
            tab.path.lastIndexOf("\\"),
            tab.path.lastIndexOf("/"),
          );
          const parentDir = tab.path.substring(0, lastSlash);
          const imgDirName = settings.imageDirectory || "img";

          try {
            const [currentEntries, imgEntries] = await Promise.all([
              tauriCommands.listDirectory(parentDir).catch(() => []),
              tauriCommands
                .listDirectory(`${parentDir}/${imgDirName}`)
                .catch(() => []),
            ]);

            const word = model.getWordUntilPosition(position);
            const range = new monaco.Range(
              position.lineNumber,
              word.startColumn,
              position.lineNumber,
              word.endColumn,
            );

            const suggestions: monaco.languages.CompletionItem[] = [
              ...currentEntries.map((e) => ({
                label: e,
                kind: e.endsWith("/")
                  ? monaco.languages.CompletionItemKind.Folder
                  : monaco.languages.CompletionItemKind.File,
                insertText: e,
                range,
              })),
              ...imgEntries.map((e) => ({
                label: `${imgDirName}/${e}`,
                kind: e.endsWith("/")
                  ? monaco.languages.CompletionItemKind.Folder
                  : monaco.languages.CompletionItemKind.File,
                insertText: `${imgDirName}/${e}`,
                range,
              })),
            ];

            return { suggestions };
          } catch (err) {
            return { suggestions: [] };
          }
        },
      },
    );

    // clipboard handling: override Ctrl+C and Ctrl+V to use Rust backend
    editor.addAction({
      id: "custom-copy",
      label: t("menu.copy", uiLanguage),
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC],
      keybindingContext: "editorTextFocus",
      run: async (ed) => {
        const selection = ed.getSelection();
        if (!selection || selection.isEmpty()) return;
        const model = ed.getModel();
        if (!model) return;
        const text = model.getValueInRange(selection);
        if (text) {
          await tauriCommands.writeClipboardText(text).catch(console.error);
        }
      },
    });

    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV,
      async () => {
        try {
          // check for image in clipboard via Rust
          const base64Image = await tauriCommands
            .readClipboardImage(settings.macosImageScaling)
            .catch(() => null);
          if (base64Image && tabManager.activeTab?.path) {
            const ext = "png"; // output of Rust command is always PNG
            const filename = `paste_${Date.now()}.${ext}`;

            const tabPath = tabManager.activeTab.path;
            const dirMatch = tabPath.match(/^(.*)[/\\][^/\\]+$/);
            if (dirMatch) {
              const parentDir = dirMatch[1];
              const imgDirName = settings.imageDirectory || "img";
              const relPath = await tauriCommands.saveImage(
                parentDir,
                filename,
                base64Image,
                imgDirName,
              );
              // Remove leading slash if imageDirectory was empty, to ensure relative path
              const escapedPath = relPath
                .replace(/ /g, "%20")
                .replace(/^\//, "");
              const embed = `![alt](${escapedPath})`;

              const position = editor.getPosition();
              if (position) {
                const selection = editor.getSelection();
                const range =
                  selection && !selection.isEmpty()
                    ? selection
                    : new monaco.Range(
                        position.lineNumber,
                        position.column,
                        position.lineNumber,
                        position.column,
                      );

                editor.executeEdits("paste-image", [
                  {
                    range,
                    text: embed,
                    forceMoveMarkers: true,
                  },
                ]);

                managedImages.push({ embed, filename, parentDir });
                return;
              }
            }
          }

          // fall through to text paste via Rust
          const rawText = await tauriCommands
            .readClipboardText()
            .catch(() => "");
          if (!rawText) return;

          const text = rawText.trim();
          const urlRegex = /^(?:(?:https?|file|tauri):\/\/|www\.)[^\s]{2,}$/i;
          const isUrl = urlRegex.test(text);

          const selections = editor.getSelections();
          const model = editor.getModel();
          if (!selections || selections.length === 0 || !model) {
            insertTextAtCursor(rawText);
            return;
          }

          // if it's not a URL or we have no multi-line selection/complex case, just insert
          const hasSelection = selections.some((s) => !s.isEmpty());
          const isMultiLine = selections.some(
            (s) => s.startLineNumber !== s.endLineNumber,
          );

          if (!isUrl || isMultiLine) {
            const edits = selections.map((s) => ({
              range: s,
              text: rawText,
              forceMoveMarkers: true,
            }));
            editor.executeEdits("paste-text", edits);
            return;
          }

          if (hasSelection) {
            const edits = selections.map((selection) => {
              const selectedText = model.getValueInRange(selection);
              const linkUrl = text.toLowerCase().startsWith("www.")
                ? `http://${text}`
                : text;
              return {
                range: selection,
                text: `[${selectedText}](${linkUrl})`,
                forceMoveMarkers: true,
              };
            });
            editor.executeEdits("paste-link", edits);
          } else {
            const displayText = text.replace(
              /^(?:https?|file|tauri):\/\/|www\./i,
              "",
            );
            const linkUrl = text.toLowerCase().startsWith("www.")
              ? `http://${text}`
              : text;
            const template = `[${displayText}](${linkUrl})`;
            const edits = selections.map((selection) => {
              return {
                range: selection,
                text: template,
                forceMoveMarkers: true,
              };
            });

            editor.executeEdits("paste-link", edits);

            let accumulatedShift = 0;
            let lastLine = -1;
            const newSelections = selections.map((s) => {
              if (s.startLineNumber !== lastLine) {
                accumulatedShift = 0;
                lastLine = s.startLineNumber;
              }
              const startColumn = s.startColumn + accumulatedShift + 1;
              const endColumn = startColumn + displayText.length;
              accumulatedShift += template.length;
              return new monaco.Selection(
                s.startLineNumber,
                startColumn,
                s.startLineNumber,
                endColumn,
              );
            });
            editor.setSelections(newSelections);
          }
        } catch (err) {
          console.error("Paste failed:", err);
        }
      },
      "editorTextFocus",
    );

    return () => {
      window.open = originalOpen;
      mediaQuery.removeEventListener("change", updateTheme);
      container.removeEventListener("wheel", wheelListener, { capture: true });
      contentChangeListener.dispose();
      if (jsonValidationTimer) {
        clearTimeout(jsonValidationTimer);
      }
      completionProvider.dispose();

      if (editor && currentTabId) {
        const state = editor.saveViewState();
        tabManager.updateTabEditorState(currentTabId, state);

        const scrollHeight = editor.getScrollHeight();
        const clientHeight = editor.getLayoutInfo().height;
        if (scrollHeight > clientHeight) {
          const percentage =
            editor.getScrollTop() / (scrollHeight - clientHeight);
          tabManager.updateTabScrollPercentage(currentTabId, percentage);
        }

        const ranges = editor.getVisibleRanges();
        if (ranges.length > 0) {
          const startLine = ranges[0].startLineNumber;
          const anchorLine = startLine + 2;
          tabManager.updateTabAnchorLine(currentTabId, anchorLine);
        }
      }

      editor.dispose();
    };
  });

  export function syncScrollToLine(line: number, ratio: number = 0) {
    if (!editor) return;

    const model = editor.getModel();
    if (!model) return;

    const safeLine = Math.max(1, Math.min(model.getLineCount(), line));
    const layout = editor.getLayoutInfo();
    const targetScroll = Math.max(
      0,
      editor.getTopForLineNumber(safeLine) - layout.height * ratio,
    );

    if (Math.abs(editor.getScrollTop() - targetScroll) <= 5) return;

    isApplyingExternalScroll = true;
    editor.setScrollTop(targetScroll, monaco.editor.ScrollType.Smooth);

    requestAnimationFrame(() => {
      isApplyingExternalScroll = false;
    });
  }

  $effect(() => {
    const activeTabId = tabManager.activeTabId;
    const content = value;

    if (!editor) return;

    if (activeTabId !== currentTabId) {
      if (currentTabId) {
        const state = editor.saveViewState();
        tabManager.updateTabEditorState(currentTabId, state);
      }

      currentTabId = activeTabId;

      if (editor.getValue() !== content) {
        editor.setValue(content);
      }

      if (tabManager.activeTab?.editorViewState) {
        editor.restoreViewState(tabManager.activeTab.editorViewState);
      } else {
        editor.setScrollTop(0);
        editor.setPosition({ lineNumber: 1, column: 1 });
      }
    } else {
      if (editor.getValue() !== content) {
        editor.setValue(content);
      }
    }
  });

  $effect(() => {
    if (editor) {
      editor.updateOptions({
        minimap: { enabled: effectiveMinimap },
        wordWrap: effectiveWordWrap as
          | "on"
          | "off"
          | "wordWrapColumn"
          | "bounded",
        wordWrapColumn: effectiveWordWrapColumn,
        lineNumbers: effectiveLineNumbers as
          | "on"
          | "off"
          | "relative"
          | "interval",
        renderLineHighlight: settings.renderLineHighlight as "line" | "none",
        occurrencesHighlight: settings.occurrencesHighlight
          ? "singleFile"
          : "off",
        fontSize: settings.editorFontSize,
        fontFamily: effectiveFontFamily,
        renderWhitespace: effectiveRenderWhitespace,
      });
    }
  });

  $effect(() => {
    if (editor && theme) {
      monaco.editor.setTheme(
        theme === "dark" ? "app-theme-dark" : "app-theme-light",
      );
    }
  });

  export async function handleDroppedFile(path: string, x: number, y: number) {
    if (!editor || !tabManager.activeTab?.path) return;

    const target = (editor as any).getTargetAtClientPoint(x, y);
    const position = target?.position || editor.getPosition();
    if (!position) return;

    const tabPath = tabManager.activeTab.path;
    const match = tabPath.match(/^(.*)[/\\][^/\\]+$/);
    if (!match) return;
    const parentDir = match[1];

    try {
      const imgDirName = settings.imageDirectory || "img";
      const relPath = await tauriCommands.copyFileToImageDirectory(
        path,
        parentDir,
        imgDirName,
      );
      // Remove leading slash if imageDirectory was empty
      const escapedPath = relPath.replace(/ /g, "%20").replace(/^\//, "");
      const embed = `![alt](${escapedPath})`;

      editor.executeEdits(
        "drop-image",
        [
          {
            range: new monaco.Range(
              position.lineNumber,
              position.column,
              position.lineNumber,
              position.column,
            ),
            text: embed,
            forceMoveMarkers: true,
          },
        ],
        [
          new monaco.Selection(
            position.lineNumber,
            position.column + embed.length,
            position.lineNumber,
            position.column + embed.length,
          ),
        ],
      );

      const actualFilename = path.split(/[/\\]/).pop() || "image";
      managedImages.push({ embed, filename: actualFilename, parentDir });
    } catch (err) {
      console.error("Failed to copy dropped file:", err);
    }
  }

  let dragCaretDecoration: string[] = [];
  export function updateDragCaret(x: number, y: number) {
    if (!editor) return;
    const target = (editor as any).getTargetAtClientPoint(x, y);
    const position = target?.position;
    if (!position) {
      hideDragCaret();
      return;
    }
    dragCaretDecoration = editor.deltaDecorations(dragCaretDecoration, [
      {
        range: new monaco.Range(
          position.lineNumber,
          position.column,
          position.lineNumber,
          position.column,
        ),
        options: {
          className: "ghost-caret",
          isWholeLine: false,
        },
      },
    ]);
  }
  export function hideDragCaret() {
    if (!editor) return;
    dragCaretDecoration = editor.deltaDecorations(dragCaretDecoration, []);
  }

  export function revealHeader(text: string) {
    if (!editor) return;
    const model = editor.getModel();
    if (!model) return;

    const escapedText = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`^#+\\s+.*${escapedText}.*$`, "m");

    const match = model.findNextMatch(
      regex.source,
      { lineNumber: 1, column: 1 },
      true,
      false,
      null,
      true,
    );

    if (match) {
      editor.revealLineInCenterIfOutsideViewport(
        match.range.startLineNumber,
        monaco.editor.ScrollType.Smooth,
      );
      editor.setSelection(match.range);
      editor.focus();
    } else {
      const fallbackMatch = model.findNextMatch(
        escapedText,
        { lineNumber: 1, column: 1 },
        false,
        false,
        null,
        false,
      );
      if (fallbackMatch) {
        editor.revealLineInCenterIfOutsideViewport(
          fallbackMatch.range.startLineNumber,
          monaco.editor.ScrollType.Smooth,
        );
        editor.setSelection(fallbackMatch.range);
        editor.focus();
      }
    }
  }

  export const undo = () => {
    editor?.focus();
    editor?.trigger("keyboard", "undo", null);
  };

  export const redo = () => {
    editor?.focus();
    editor?.trigger("keyboard", "redo", null);
  };

  export const triggerFind = () => {
    if (!editor) return;
    editor.focus();
    const domNode = editor.getDomNode();
    const findWidgetVisible = !!domNode?.querySelector(".find-widget.visible");
    if (findWidgetVisible) {
      editor.trigger("keyboard", "closeFindWidget", null);
    } else {
      editor.getAction("actions.find")?.run();
    }
  };

  export const getValue = () => editor?.getValue() || "";
  export const setValue = (val: string) => editor?.setValue(val);
  export const focus = () => editor?.focus();
  export const getViewState = () => editor?.saveViewState();
  export const restoreViewState = (state: any) =>
    editor?.restoreViewState(state);
  export const revealLine = (line: number) => editor?.revealLineInCenter(line);
</script>

<div class="editor-outer">
  {#if language === "markdown" && settings.showMarkdownToolbar}
    <MarkdownToolbar onaction={applyMarkdownToolbarAction} />
  {/if}
  <div class="editor-container" bind:this={container}></div>

  {#if settings.statusBar}
    <div class="status-bar">
      <div class="status-item">
        {t("editor.status.lineCol", settings.language)
          .replace("{{line}}", (cursorPosition?.lineNumber ?? 1).toString())
          .replace("{{col}}", (cursorPosition?.column ?? 1).toString())}
      </div>
      {#if selectionCount > 0}
        <div class="status-item">
          {t("editor.status.selected", settings.language).replace(
            "{{count}}",
            selectionCount.toString(),
          )}
        </div>
      {:else if cursorCount > 1}
        <div class="status-item">
          {t("editor.status.selections", settings.language).replace(
            "{{count}}",
            cursorCount.toString(),
          )}
        </div>
      {/if}
      {#if isMarkdownLanguage && settings.wordCount}
        <div class="status-item">
          {t("editor.status.words", settings.language).replace(
            "{{count}}",
            wordCount.toString(),
          )}
        </div>
      {/if}
      <div class="status-item">
        {zoomLevel}%
      </div>
      <div class="status-item">
        {currentLanguage}
      </div>
      <div class="status-item">{t("editor.status.crlf")}</div>
      <div class="status-item">{t("editor.status.utf8")}</div>
    </div>
  {/if}
</div>

<style>
  .editor-outer {
    position: relative;
    flex: 1;
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    background-color: var(--color-canvas-default);
    overflow: hidden;
  }

  .editor-container {
    flex: 1;
    height: 0;
    width: 100%;
    min-width: 0;
    min-height: 0;
  }

  :global(.ghost-caret) {
    border-left: 2px solid var(--color-accent-fg);
    margin-left: -1px;
    opacity: 0.6;
  }

  :global(.monaco-editor .monaco-scrollable-element > .scrollbar.vertical) {
    width: 6px !important;
    background: transparent !important;
    border: 0 !important;
  }

  :global(
    .monaco-editor .monaco-scrollable-element > .scrollbar.vertical > .slider
  ) {
    left: 2px !important;
    width: 3px !important;
    border-radius: 999px;
    background: color-mix(
      in srgb,
      var(--color-fg-muted) 48%,
      transparent
    ) !important;
    transition: background-color 120ms ease;
  }

  :global(
    .monaco-editor
      .monaco-scrollable-element
      > .scrollbar.vertical
      > .slider:hover
  ) {
    background: color-mix(
      in srgb,
      var(--color-fg-muted) 68%,
      transparent
    ) !important;
  }

  :global(
    .monaco-editor
      .monaco-scrollable-element
      > .scrollbar.vertical
      > .slider.active
  ) {
    background: color-mix(
      in srgb,
      var(--color-fg-default) 72%,
      transparent
    ) !important;
  }

  :global(
    .monaco-editor .monaco-scrollable-element > .scrollbar > .arrow-background,
    .monaco-editor .monaco-scrollable-element > .scrollbar > .scra
  ) {
    display: none !important;
  }

  :global(.monaco-editor .monaco-scrollable-element > .scrollbar.horizontal) {
    height: 6px !important;
    background: transparent !important;
    border: 0 !important;
  }

  :global(
    .monaco-editor .monaco-scrollable-element > .scrollbar.horizontal > .slider
  ) {
    top: 2px !important;
    height: 3px !important;
    border-radius: 999px;
    background: color-mix(
      in srgb,
      var(--color-fg-muted) 48%,
      transparent
    ) !important;
  }

  .status-bar {
    padding: 0 10px;
    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    font-size: 12px;
    background: var(--bg-tertiary);
    border-top: 1px solid var(--color-border-muted);
    color: var(--text-primary);
    display: flex;
    align-items: center;
    justify-content: flex-end;
    min-height: 22px;
    gap: 20px;
    user-select: none;
  }

  .status-item {
    opacity: 0.8;
  }
</style>
