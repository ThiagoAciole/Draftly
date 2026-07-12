import { describe, expect, it } from "vitest";
import { getMarkdownHeadings } from "./markdownOutline";

describe("getMarkdownHeadings", () => {
  it("extracts headings with their level and original line", () => {
    expect(getMarkdownHeadings("# Título\nTexto\n### Detalhe ##")).toEqual([
      { level: 1, text: "Título", line: 0 },
      { level: 3, text: "Detalhe", line: 2 },
    ]);
  });

  it("ignores headings inside fenced code blocks", () => {
    expect(getMarkdownHeadings("# Visível\n```md\n# Não é título\n```\n## Também visível")).toEqual([
      { level: 1, text: "Visível", line: 0 },
      { level: 2, text: "Também visível", line: 4 },
    ]);
  });
});
