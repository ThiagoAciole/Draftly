import { describe, expect, it } from "vitest";
import { getRecoverableDrafts } from "./recoveryDrafts";

describe("getRecoverableDrafts", () => {
  it("mantém somente abas com alterações não salvas", () => {
    const drafts = getRecoverableDrafts([
      { id: "saved", path: "C:/notes/saved.md", name: "saved.md", markdown: "igual", savedMarkdown: "igual" },
      { id: "dirty", path: "C:/notes/dirty.md", name: "dirty.md", markdown: "novo", savedMarkdown: "antigo" },
      { id: "new", path: null, name: "Sem título.md", markdown: "rascunho", savedMarkdown: "" },
    ]);

    expect(drafts).toEqual([
      { id: "dirty", path: "C:/notes/dirty.md", name: "dirty.md", markdown: "novo", savedMarkdown: "antigo" },
      { id: "new", path: null, name: "Sem título.md", markdown: "rascunho", savedMarkdown: "" },
    ]);
  });
});
