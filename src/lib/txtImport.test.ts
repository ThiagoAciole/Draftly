import { describe, expect, it } from "vitest";
import { getTemporaryMarkdownName, isTextImportPath } from "./txtImport";

describe("importação de TXT", () => {
  it("cria um nome Markdown temporário para um TXT", () => {
    expect(getTemporaryMarkdownName("Postely Ment.txt")).toBe("Postely Ment.md");
  });

  it("identifica TXT sem confundir extensões", () => {
    expect(isTextImportPath("C:/Notas/rascunho.TXT")).toBe(true);
    expect(isTextImportPath("C:/Notas/rascunho.md")).toBe(false);
  });
});
