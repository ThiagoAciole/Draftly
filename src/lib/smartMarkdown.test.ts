import { describe, expect, it } from "vitest";
import { formatPlainTextAsMarkdown } from "./smartMarkdown";

describe("formatPlainTextAsMarkdown", () => {
  it("transforma um título, parágrafos e CSV em Markdown legível", () => {
    expect(formatPlainTextAsMarkdown(`Planejamento semanal
Definimos as prioridades do produto e os próximos passos.
Cada responsável deve atualizar suas entregas.

Responsável,Status
Ana,Concluído
Bruno,Em andamento`)).toBe(`# Planejamento semanal

Definimos as prioridades do produto e os próximos passos. Cada responsável deve atualizar suas entregas.

| Responsável | Status |
| --- | --- |
| Ana | Concluído |
| Bruno | Em andamento |`);
  });

  it("preserva Markdown e blocos de código existentes", () => {
    expect(formatPlainTextAsMarkdown(`# Nota

- manter esta lista

\`\`\`ts
const ativo = true;
\`\`\``)).toBe(`# Nota

- manter esta lista

\`\`\`ts
const ativo = true;
\`\`\``);
  });
});
