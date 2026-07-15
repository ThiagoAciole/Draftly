import { describe, expect, it } from "vitest";
import { getLanguageForPath, isSupportedDocumentPath, supportedDocumentFilter, supportedExtensions } from "./languages";

describe("document languages", () => {
  it("infers every supported extension case-insensitively", () => {
    expect(getLanguageForPath("C:/code/app.TS").id).toBe("typescript");
    expect(getLanguageForPath("C:/code/index.html").id).toBe("html");
    expect(getLanguageForPath("notes.md").editorKind).toBe("visual-markdown");
    expect(getLanguageForPath("notes.txt")).toMatchObject({ id: "plaintext", editorKind: "plain-text" });
    expect(supportedExtensions).toEqual(["md", "txt", "json", "js", "ts", "py", "html"]);
    expect(supportedDocumentFilter).toEqual({
      name: "Arquivos suportados",
      extensions: ["md", "txt", "json", "js", "ts", "py", "html"],
    });
  });

  it("accepts only the document extensions exposed by Draftly", () => {
    expect(isSupportedDocumentPath("arquivo.JSON")).toBe(true);
    expect(isSupportedDocumentPath("arquivo.tsx")).toBe(false);
    expect(isSupportedDocumentPath("arquivo.txt")).toBe(true);
  });
});
