type SourceEditorProps = {
  markdown: string;
  onChange: (markdown: string) => void;
};

export function SourceEditor({ markdown, onChange }: SourceEditorProps) {
  return (
    <section className="source-editor" aria-label="Editor Markdown fonte">
      <div className="source-editor-notice">
        Você está editando o Markdown original. Use o modo visual para formatação em blocos.
      </div>
      <textarea
        className="source-editor-input"
        aria-label="Conteúdo Markdown"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        value={markdown}
        onChange={(event) => onChange(event.target.value)}
      />
    </section>
  );
}
