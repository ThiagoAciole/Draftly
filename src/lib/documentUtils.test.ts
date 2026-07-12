import { describe, expect, it } from "vitest";
import { getRestoredActiveTabId, isDocumentDirty } from "./documentUtils";

describe("isDocumentDirty", () => {
  it("marks a new document as dirty after its first edit", () => {
    expect(isDocumentDirty("Texto novo", "")).toBe(true);
  });

  it("marks a document as clean when content matches the last save", () => {
    expect(isDocumentDirty("# Rascunho", "# Rascunho")).toBe(false);
  });
});

describe("getRestoredActiveTabId", () => {
  const tabs = [
    { id: "tab-1", path: "C:/Notas/ideias.md" },
    { id: "tab-2", path: "C:/Notas/plano.md" },
  ];

  it("restores the tab that was active when the session was saved", () => {
    expect(getRestoredActiveTabId(tabs, "C:/Notas/plano.md")).toBe("tab-2");
  });

  it("returns null when the saved file is no longer available", () => {
    expect(getRestoredActiveTabId(tabs, "C:/Notas/removido.md")).toBeNull();
  });
});
