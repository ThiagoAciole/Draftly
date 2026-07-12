import { useRef } from "react";
import { EditorModeSwitch } from "./EditorModeSwitch";

type SourceEditorProps = {
  markdown: string;
  onChange: (markdown: string) => void;
};

function highlightInlineMarkdown(line: string) {
  const parts = line.split(/(`[^`]*`|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|!?\[[^\]]*\]\([^)]*\))/g);

  return parts.map((part, index) => {
    if (/^`[^`]*`$/.test(part)) return <span className="syntax-inline-code" key={index}>{part}</span>;
    if (/^(\*\*|__)/.test(part)) return <span className="syntax-strong" key={index}>{part}</span>;
    if (/^(\*|_)/.test(part)) return <span className="syntax-emphasis" key={index}>{part}</span>;
    if (/^!?\[/.test(part)) return <span className="syntax-link" key={index}>{part}</span>;
    return part;
  });
}

function renderMarkdownLine(line: string, isInsideCodeBlock: boolean) {
  if (isInsideCodeBlock || /^\s*(```|~~~)/.test(line)) {
    return <span className="syntax-code-block">{line || " "}</span>;
  }

  const heading = /^(#{1,6})(\s+.*)$/.exec(line);
  if (heading) {
    return <><span className="syntax-heading-mark">{heading[1]}</span><span className="syntax-heading">{heading[2]}</span></>;
  }

  const quote = /^(>)(.*)$/.exec(line);
  if (quote) return <><span className="syntax-quote-mark">{quote[1]}</span>{highlightInlineMarkdown(quote[2])}</>;

  const list = /^(\s*(?:[-*+]|\d+\.|\[[ xX]\]))(\s+.*)$/.exec(line);
  if (list) return <><span className="syntax-list-mark">{list[1]}</span>{highlightInlineMarkdown(list[2])}</>;

  return highlightInlineMarkdown(line || " ");
}

export function SourceEditor({ markdown, onChange }: SourceEditorProps) {
  const highlightRef = useRef<HTMLPreElement>(null);
  let isInsideCodeBlock = false;
  const lines = markdown.split(/\r?\n/);

  return (
    <section className="source-editor" aria-label="Editor Markdown fonte">
      <div className="source-editor-codeframe">
        <EditorModeSwitch />
        <pre className="source-editor-highlight" ref={highlightRef} aria-hidden="true"><code>{lines.map((line, index) => {
          const isFence = /^\s*(```|~~~)/.test(line);
          const content = renderMarkdownLine(line, isInsideCodeBlock);
          if (isFence) isInsideCodeBlock = !isInsideCodeBlock;

          return (
            <span className="source-editor-line" key={index}>
              <span className="source-editor-line-number">{index + 1}</span>
              <span className="source-editor-line-content">{content}</span>
            </span>
          );
        })}</code></pre>
        <textarea
          className="source-editor-input"
          aria-label="Conteúdo Markdown"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          wrap="off"
          value={markdown}
          onChange={(event) => onChange(event.target.value)}
          onScroll={(event) => {
            const target = event.currentTarget;
            if (highlightRef.current) {
              highlightRef.current.scrollTop = target.scrollTop;
              highlightRef.current.scrollLeft = target.scrollLeft;
            }
          }}
        />
      </div>
    </section>
  );
}
