import type { KeyboardEvent } from "react";

type PlainTextEditorProps = {
  content: string;
  onChange: (content: string) => void;
};

export function PlainTextEditor({ content, onChange }: PlainTextEditorProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Tab") return;

    event.preventDefault();
    const input = event.currentTarget;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const nextContent = `${content.slice(0, start)}\t${content.slice(end)}`;

    onChange(nextContent);
    window.requestAnimationFrame(() => {
      input.selectionStart = start + 1;
      input.selectionEnd = start + 1;
    });
  };

  return (
    <section className="plain-text-editor" aria-label="Editor de texto simples">
      <textarea
        className="plain-text-input"
        aria-label="Editor de texto simples"
        value={content}
        placeholder="Comece a escrever..."
        spellCheck
        wrap="soft"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
      />
    </section>
  );
}
