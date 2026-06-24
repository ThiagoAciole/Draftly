import { describe, expect, it } from "vitest";
import {
  getFileType,
  isMarkdownPath,
  isPlainTextPath,
  getLanguage,
  getFileIcon,
  FILE_TYPES,
} from "./file-types.js";

describe("file type registry", () => {
  it("detects Markdown files correctly", () => {
    expect(isMarkdownPath("test.md")).toBe(true);
    expect(isMarkdownPath("TEST.MARKDOWN")).toBe(true);
    expect(isMarkdownPath("test.mdown")).toBe(true);
    expect(isMarkdownPath("test.txt")).toBe(false);
    expect(isMarkdownPath("")).toBe(true); // Unsaved unsaved tab default
  });

  it("detects Plaintext files correctly", () => {
    expect(isPlainTextPath("test.txt")).toBe(true);
    expect(isPlainTextPath("test.log")).toBe(true);
    expect(isPlainTextPath("test.md")).toBe(false);
  });

  it("maps extensions to correct languages", () => {
    expect(getLanguage("app.js")).toBe("javascript");
    expect(getLanguage("app.jsx")).toBe("javascript");
    expect(getLanguage("main.ts")).toBe("typescript");
    expect(getLanguage("main.tsx")).toBe("typescript");
    expect(getLanguage("index.html")).toBe("html");
    expect(getLanguage("styles.css")).toBe("css");
    expect(getLanguage("data.json")).toBe("json");
    expect(getLanguage("config.jsonc")).toBe("json");
    expect(getLanguage("script.py")).toBe("python");
    expect(getLanguage("cargo.toml")).toBe("plaintext"); // Unknown mappings fallback to plaintext
  });

  it("returns correct capabilities", () => {
    const mdType = getFileType("note.md");
    expect(mdType.canPreview).toBe(true);
    expect(mdType.canFormat).toBe(false);
    expect(mdType.canExport).toBe(true);

    const jsonType = getFileType("data.json");
    expect(jsonType.canPreview).toBe(true);
    expect(jsonType.canFormat).toBe(true);
    expect(jsonType.canExport).toBe(true);

    const txtType = getFileType("log.txt");
    expect(txtType.canPreview).toBe(false);
    expect(txtType.canFormat).toBe(false);
    expect(txtType.canExport).toBe(true);
  });

  it("returns correct icons", () => {
    const mdIcon = getFileIcon("note.md");
    expect(mdIcon).toBe(FILE_TYPES.markdown.icon);

    const txtIcon = getFileIcon("note.txt");
    expect(txtIcon).toBe(FILE_TYPES.text.icon);
  });
});
