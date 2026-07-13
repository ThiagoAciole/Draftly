import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, crosshairCursor, drawSelection, dropCursor, highlightActiveLine, highlightSpecialChars, keymap, lineNumbers, rectangularSelection } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { HighlightStyle, bracketMatching, foldGutter, foldKeymap, indentOnInput, syntaxHighlighting } from "@codemirror/language";
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from "@codemirror/autocomplete";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { tags } from "@lezer/highlight";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { python } from "@codemirror/lang-python";
import { html } from "@codemirror/lang-html";
import { markdown } from "@codemirror/lang-markdown";
import { EditorModeSwitch } from "./EditorModeSwitch";
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
  "&": { height: "100%", backgroundColor: "var(--bg-elevated)", color: "#d4d7dd" },
  ".cm-scroller": { fontFamily: '"Cascadia Code", "Fira Code", ui-monospace, monospace', fontSize: "15px", lineHeight: "1.7", overflow: "auto" },
  ".cm-content": { padding: "18px 24px 40px" },
  ".cm-gutters": { backgroundColor: "var(--bg-elevated)", color: "#5f6470", border: "none" },
  ".cm-lineNumbers .cm-gutterElement": { minWidth: "34px", paddingRight: "10px" },
  ".cm-foldGutter": { width: "18px", marginLeft: "10px" },
  ".cm-foldGutter .cm-gutterElement": { opacity: "0", transition: "opacity 120ms ease" },
  ".cm-foldGutter:hover .cm-gutterElement": { opacity: "1" },
  ".draftly-fold-chevron": { display: "inline-flex", alignItems: "center", justifyContent: "center", width: "14px", height: "14px", color: "#a9c7df" },
  ".draftly-fold-chevron svg": { width: "14px", height: "14px", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", transition: "transform 120ms ease" },
  ".draftly-fold-chevron.is-collapsed svg": { transform: "rotate(-90deg)" },
  ".cm-activeLine": { backgroundColor: "rgba(255,255,255,0.035)" },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": { backgroundColor: "rgba(139,108,255,0.3)" },
  ".cm-cursor": { borderLeftColor: "#f1f3f8" },
  ".cm-tooltip": { backgroundColor: "#303030", border: "1px solid var(--border)", color: "var(--text)" },
  ".cm-panels": { backgroundColor: "#303030", color: "var(--text)", borderBottom: "1px solid var(--border)" },
  ".cm-foldPlaceholder": { backgroundColor: "rgba(139,108,255,0.15)", border: "none", color: "#d9d0ff" },
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
  lineNumbers(),
  highlightSpecialChars(),
  history(),
  foldGutter({ markerDOM: createFoldChevron }),
  drawSelection(),
  dropCursor(),
  EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
  syntaxHighlighting(draftlyHighlightStyle, { fallback: true }),
  bracketMatching(),
  closeBrackets(),
  autocompletion(),
  rectangularSelection(),
  crosshairCursor(),
  highlightActiveLine(),
  highlightSelectionMatches(),
  keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, ...foldKeymap, ...completionKeymap, ...searchKeymap, indentWithTab]),
];

export function SourceEditor({ content, language, showModeSwitch = false, onChange }: SourceEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const contentRef = useRef(content);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!hostRef.current) return;
    const view = new EditorView({
      state: EditorState.create({ doc: content, extensions: [
        editorSetup, languageExtension(language), draftlyTheme,
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
    window.addEventListener("draftly:scroll-to-line", scrollToLine);
    return () => { window.removeEventListener("draftly:scroll-to-line", scrollToLine); view.destroy(); viewRef.current = null; };
  }, [language]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || content === contentRef.current) return;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: content } });
    contentRef.current = content;
  }, [content]);

  return <section className="source-editor" aria-label={`Editor ${language}`}><div className="source-editor-codeframe">{showModeSwitch ? <EditorModeSwitch /> : null}<div className="source-editor-host" ref={hostRef} /></div></section>;
}
