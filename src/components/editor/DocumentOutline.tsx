import { ListTree } from "lucide-react";
import { getMarkdownHeadings } from "../../lib/markdownOutline";

type DocumentOutlineProps = {
  markdown: string;
  mode: "visual" | "source";
  isOpen: boolean;
};

function scrollSourceEditorTo(line: number) {
  const editor = document.querySelector<HTMLTextAreaElement>(".source-editor-input");
  if (!editor) return;

  const lines = editor.value.split(/\r?\n/);
  const offset = lines.slice(0, line).reduce((total, value) => total + value.length + 1, 0);
  editor.focus();
  editor.setSelectionRange(offset, offset);
  editor.scrollTop = Math.max(0, line * 25 - editor.clientHeight * 0.35);
}

function scrollVisualEditorTo(index: number) {
  const headings = document.querySelectorAll<HTMLElement>(".editor-canvas h1, .editor-canvas h2, .editor-canvas h3, .editor-canvas h4, .editor-canvas h5, .editor-canvas h6");
  headings[index]?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function DocumentOutline({ markdown, mode, isOpen }: DocumentOutlineProps) {
  const headings = getMarkdownHeadings(markdown);

  return (
    <aside className={`document-outline ${isOpen ? "is-open" : ""}`} aria-hidden={!isOpen} aria-label="Estrutura do documento">
      {isOpen ? (
        <>
          <div className="document-outline-title">
            <ListTree size={15} />
            <span>Estrutura</span>
          </div>
          {headings.length > 0 ? (
            <nav className="document-outline-list" aria-label="Títulos do documento">
              {headings.map((heading, index) => (
                <button
                  className="document-outline-item"
                  key={`${heading.line}-${heading.text}`}
                  style={{ paddingLeft: `${12 + (heading.level - 1) * 12}px` }}
                  title={heading.text}
                  type="button"
                  onClick={() => {
                    if (mode === "source") scrollSourceEditorTo(heading.line);
                    else scrollVisualEditorTo(index);
                  }}
                >
                  {heading.text}
                </button>
              ))}
            </nav>
          ) : (
            <p className="document-outline-empty">Nenhum título encontrado</p>
          )}
        </>
      ) : null}
    </aside>
  );
}
