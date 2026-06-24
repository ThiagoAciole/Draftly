import { describe, expect, it, vi } from "vitest";
import { saveDocumentSnapshot } from "./document-save.js";

describe("saveDocumentSnapshot", () => {
  it("marks the document clean when the buffer did not change during the write", async () => {
    const write = vi.fn().mockResolvedValue(undefined);

    const result = await saveDocumentSnapshot({
      path: "note.md",
      content: "saved content",
      getCurrentContent: () => "saved content",
      write,
    });

    expect(write).toHaveBeenCalledWith("note.md", "saved content");
    expect(result).toEqual({
      savedContent: "saved content",
      isDirty: false,
    });
  });

  it("keeps the document dirty when the user edits during the write", async () => {
    let currentContent = "first version";
    const write = vi.fn().mockImplementation(async () => {
      currentContent = "newer version";
    });

    const result = await saveDocumentSnapshot({
      path: "note.md",
      content: currentContent,
      getCurrentContent: () => currentContent,
      write,
    });

    expect(result).toEqual({
      savedContent: "first version",
      isDirty: true,
    });
  });

  it("propagates write errors without changing document state", async () => {
    const writeError = new Error("access denied");

    await expect(
      saveDocumentSnapshot({
        path: "note.md",
        content: "draft",
        getCurrentContent: () => "draft",
        write: vi.fn().mockRejectedValue(writeError),
      }),
    ).rejects.toBe(writeError);
  });
});
