import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import {
  EditorView,
  crosshairCursor,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { HighlightStyle, bracketMatching, foldGutter, foldKeymap, indentOnInput, indentUnit, syntaxHighlighting } from "@codemirror/language";
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from "@codemirror/autocomplete";
import { highlightSelectionMatches, openSearchPanel, search, searchKeymap } from "@codemirror/search";
import { tags } from "@lezer/highlight";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { python } from "@codemirror/lang-python";
import { html } from "@codemirror/lang-html";
import { markdown } from "@codemirror/lang-markdown";
import { EditorModeSwitch } from "./EditorModeSwitch";
import { createSourceSearchPanel } from "./sourceSearchPanel";
import { useSettings } from "../../contexts/SettingsContext";
import { OPEN_SOURCE_SEARCH_EVENT } from "../../lib/editorEvents";
import type { DocumentLanguage } from "../../lib/languages";

type SourceEditorProps = { content: string; language: DocumentLanguage; showModeSwitch?: boolean; onChange: (content: string) => void };

function languageExtension(language: DocumentLanguage) {
  switch (language) {
    case "json": return json();
    case "javascript": return javascript();
    case "typescript": return javascript({ typescript: true });
    case "python": return python();
    case "html": return html();
    default: return markdown();
  }
}

const draftlyTheme = EditorView.theme({
  "&": {
    height: "100%",
    backgroundColor: "var(--source-editor-bg)",
    color: "#d4d7dd",
  },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": {
    fontFamily: '"Cascadia Code", "Fira Code", ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: "var(--code-editor-font-size)",
    fontVariantLigatures: "contextual",
    lineHeight: "1.58",
    overflow: "auto",
    scrollbarColor: "rgba(255, 255, 255, 0.18) transparent",
    scrollbarWidth: "thin",
  },
  ".cm-content": {
    padding: "22px 0 48px",
    caretColor: "#f1f3f8",
  },
  ".cm-line": {
    padding: "0 28px 0 18px",
  },
  ".cm-gutters": {
    backgroundColor: "var(--source-editor-gutter)",
    color: "#5f6470",
    borderRight: "1px solid var(--source-editor-divider)",
  },
  ".cm-lineNumbers": {
    fontSize: "12.5px",
    fontVariantNumeric: "tabular-nums",
  },
  ".cm-lineNumbers .cm-gutterElement": {
    minWidth: "42px",
    padding: "0 10px 0 8px",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "transparent",
    color: "#a2a8b3",
  },
  ".cm-foldGutter": { width: "18px" },
  ".cm-foldGutter .cm-gutterElement": {
    opacity: "0",
    transition: "opacity 140ms ease",
  },
  ".cm-foldGutter:hover .cm-gutterElement, .cm-foldGutter .cm-activeLineGutter": {
    opacity: "1",
  },
  ".draftly-fold-chevron": { display: "inline-flex", alignItems: "center", justifyContent: "center", width: "14px", height: "14px", color: "#a9c7df" },
  ".draftly-fold-chevron svg": { width: "14px", height: "14px", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", transition: "transform 120ms ease" },
  ".draftly-fold-chevron.is-collapsed svg": { transform: "rotate(-90deg)" },
  ".cm-activeLine": {
    background: "linear-gradient(90deg, rgba(255,255,255,0.032), rgba(255,255,255,0.012) 72%, transparent)",
  },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": { backgroundColor: "rgba(139,108,255,0.3)" },
  ".cm-cursor": { borderLeftColor: "#f1f3f8" },
  ".cm-tooltip": { backgroundColor: "#303030", border: "1px solid var(--border)", color: "var(--text)" },
  ".cm-panels": { backgroundColor: "#303030", color: "var(--text)", borderBottom: "1px solid var(--border)" },
  ".cm-panels.cm-panels-bottom": {
    borderTop: "1px solid rgba(255, 255, 255, 0.06)",
    borderBottom: "none",
    backgroundColor: "var(--bg)",
  },
  ".cm-panel.cm-source-search": {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    minHeight: "96px",
    padding: "8px 16px",
    overflowX: "auto",
    backgroundColor: "var(--bg)",
  },
  ".cm-source-search-row": {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: "8px",
    width: "min(820px, 100%)",
    minWidth: "820px",
  },
  ".cm-source-search-input-wrap": {
    position: "relative",
    display: "flex",
    alignItems: "center",
    flex: "0 1 400px",
    width: "400px",
  },
  ".cm-source-search-input-wrap > .cm-source-search-icon": {
    position: "absolute",
    left: "12px",
    color: "var(--faint)",
    pointerEvents: "none",
  },
  ".cm-source-search-input": {
    width: "100%",
    height: "40px",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "8px",
    outline: "none",
    padding: "10px 12px 10px 36px",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    color: "var(--text)",
    fontFamily: "inherit",
    fontSize: "16px",
    transition: "border-color 140ms ease, background-color 140ms ease",
  },
  ".cm-source-search-input:focus": {
    borderColor: "var(--accent)",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  ".cm-source-search-input::placeholder": { color: "var(--faint)" },
  ".cm-source-search-replace-row": { minHeight: "40px" },
  ".cm-source-search-replace-input": {
    flex: "0 1 400px",
    width: "400px",
    paddingLeft: "12px",
  },
  ".cm-source-search-count": {
    flexShrink: "0",
    minWidth: "70px",
    marginLeft: "16px",
    color: "var(--faint)",
    fontFamily: "inherit",
    fontSize: "14px",
    textAlign: "left",
    userSelect: "none",
  },
  ".cm-source-search-button": {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: "0",
    width: "32px",
    height: "32px",
    border: "none",
    borderRadius: "7px",
    padding: "0",
    backgroundColor: "transparent",
    color: "var(--muted)",
    cursor: "pointer",
    transition: "background-color 100ms ease, color 100ms ease",
  },
  ".cm-source-search-button:hover:not(:disabled)": {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    color: "var(--text)",
  },
  ".cm-source-search-button:disabled": { opacity: "0.35", cursor: "default" },
  ".cm-source-search-text-button": {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: "0",
    minWidth: "32px",
    height: "32px",
    border: "1px solid transparent",
    borderRadius: "7px",
    padding: "0 8px",
    backgroundColor: "transparent",
    color: "var(--muted)",
    fontFamily: "inherit",
    fontSize: "12px",
    cursor: "pointer",
    transition: "background-color 100ms ease, border-color 100ms ease, color 100ms ease",
  },
  ".cm-source-search-text-button:hover:not(:disabled)": {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    color: "var(--text)",
  },
  ".cm-source-search-text-button.is-active": {
    borderColor: "rgba(139, 108, 255, 0.45)",
    backgroundColor: "var(--accent-soft)",
    color: "#d9d0ff",
  },
  ".cm-source-search-text-button.is-action": {
    minWidth: "96px",
    borderColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    fontSize: "13px",
  },
  ".cm-source-search-replace-row .cm-source-search-text-button:last-child": { minWidth: "116px" },
  ".cm-source-search-text-button:disabled": { opacity: "0.35", cursor: "default" },
  ".cm-source-search-close": { marginLeft: "2px" },
  ".cm-source-search [hidden]": { display: "none !important" },
  ".cm-source-search-icon": {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  ".cm-source-search-icon svg": { width: "16px", height: "16px" },
  ".cm-foldPlaceholder": { backgroundColor: "rgba(139,108,255,0.15)", border: "none", color: "#d9d0ff" },
  ".cm-scroller::-webkit-scrollbar": { width: "8px", height: "8px" },
  ".cm-scroller::-webkit-scrollbar-track": { background: "transparent" },
  ".cm-scroller::-webkit-scrollbar-thumb": {
    background: "rgba(255, 255, 255, 0.16)",
    border: "2px solid transparent",
    borderRadius: "999px",
    backgroundClip: "padding-box",
  },
  ".cm-scroller::-webkit-scrollbar-thumb:hover": { background: "rgba(255, 255, 255, 0.25)" },
}, { dark: true });

const draftlyHighlightStyle = HighlightStyle.define([
  { tag: [tags.propertyName, tags.attributeName], color: "#ff7b85" },
  { tag: tags.string, color: "#9fdb73" },
  { tag: [tags.number, tags.bool, tags.null], color: "#f5a45a" },
  { tag: [tags.keyword, tags.definitionKeyword], color: "#d29af4" },
  { tag: [tags.punctuation, tags.bracket], color: "#9bc0d8" },
  { tag: [tags.variableName, tags.name], color: "#d9e2ec" },
  { tag: tags.comment, color: "#758295", fontStyle: "italic" },
  { tag: tags.operator, color: "#d9e2ec" },
]);

function createFoldChevron(open: boolean): HTMLElement {
  const icon = document.createElement("span");
  icon.className = `draftly-fold-chevron${open ? "" : " is-collapsed"}`;
  icon.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>';
  return icon;
}

const editorSetup = [
  highlightSpecialChars(),
  history(),
  foldGutter({ markerDOM: createFoldChevron }),
  drawSelection(),
  dropCursor(),
  EditorState.allowMultipleSelections.of(true),
  EditorState.phrases.of({
    Find: "Buscar...",
    next: "Próximo",
    previous: "Anterior",
    close: "Fechar",
  }),
  indentOnInput(),
  syntaxHighlighting(draftlyHighlightStyle, { fallback: true }),
  bracketMatching(),
  closeBrackets(),
  rectangularSelection(),
  crosshairCursor(),
  highlightActiveLine(),
  highlightActiveLineGutter(),
  search({ top: false, createPanel: createSourceSearchPanel }),
  highlightSelectionMatches(),
  keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, ...foldKeymap, ...completionKeymap, ...searchKeymap, indentWithTab]),
];

export function SourceEditor({ content, language, showModeSwitch = false, onChange }: SourceEditorProps) {
  const { settings } = useSettings();
  const codeSettings = settings.codeEditor;
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const contentRef = useRef(content);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!hostRef.current) return;
    const view = new EditorView({
      state: EditorState.create({ doc: content, extensions: [
        codeSettings.showLineNumbers ? lineNumbers() : [],
        editorSetup,
        codeSettings.autocomplete ? autocompletion() : [],
        EditorState.tabSize.of(codeSettings.tabSize),
        indentUnit.of(" ".repeat(codeSettings.tabSize)),
        languageExtension(language),
        language === "markdown" || codeSettings.wordWrap ? EditorView.lineWrapping : [],
        draftlyTheme,
        EditorView.updateListener.of((update) => {
          if (!update.docChanged) return;
          const next = update.state.doc.toString();
          contentRef.current = next;
          onChangeRef.current(next);
        }),
      ] }), parent: hostRef.current,
    });
    viewRef.current = view;
    const scrollToLine = (event: Event) => {
      const line = (event as CustomEvent<number>).detail;
      if (!line || line < 1) return;
      const position = view.state.doc.line(Math.min(line, view.state.doc.lines)).from;
      view.dispatch({ selection: { anchor: position }, effects: EditorView.scrollIntoView(position, { y: "center" }) });
      view.focus();
    };
    const openSearch = () => {
      openSearchPanel(view);
    };
    window.addEventListener("draftly:scroll-to-line", scrollToLine);
    window.addEventListener(OPEN_SOURCE_SEARCH_EVENT, openSearch);
    return () => {
      window.removeEventListener("draftly:scroll-to-line", scrollToLine);
      window.removeEventListener(OPEN_SOURCE_SEARCH_EVENT, openSearch);
      view.destroy();
      viewRef.current = null;
    };
  }, [codeSettings.autocomplete, codeSettings.showLineNumbers, codeSettings.tabSize, codeSettings.wordWrap, language]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || content === contentRef.current) return;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: content } });
    contentRef.current = content;
  }, [content]);

  return (
    <section className="source-editor" aria-label={`Editor ${language}`}>
      <div className="source-editor-codeframe">
        {showModeSwitch ? <EditorModeSwitch /> : null}
        <div className="source-editor-host" ref={hostRef} />
      </div>
    </section>
  );
}
