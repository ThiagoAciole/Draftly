import { describe, expect, it } from "vitest";
import { normalizeImportedMarkdown } from "./normalizeImportedMarkdown";

describe("normalizeImportedMarkdown", () => {
  it("separa linhas consecutivas de prosa em blocos Markdown", () => {
    expect(
      normalizeImportedMarkdown("Primeira ideia\nSegunda ideia\nTerceira ideia"),
    ).toBe("Primeira ideia\n\nSegunda ideia\n\nTerceira ideia");
  });

  it("preserva estruturas Markdown e normaliza apenas a prosa seguinte", () => {
    expect(
      normalizeImportedMarkdown(
        "# Título\n- Primeiro item\n- Segundo item\n\nParágrafo um\nParágrafo dois",
      ),
    ).toBe(
      "# Título\n- Primeiro item\n- Segundo item\n\nParágrafo um\n\nParágrafo dois",
    );
  });

  it("não altera as linhas internas de um bloco de código cercado", () => {
    expect(
      normalizeImportedMarkdown(
        "```ts\nconst first = 1;\nconst second = 2;\n```\nTexto final\nOutra linha",
      ),
    ).toBe(
      "```ts\nconst first = 1;\nconst second = 2;\n```\nTexto final\n\nOutra linha",
    );
  });
});
