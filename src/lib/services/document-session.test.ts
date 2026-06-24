import { describe, expect, it } from "vitest";
import {
  createDocumentSession,
  markSessionConflict,
  markSessionSaved,
} from "./document-session.js";

describe("document session", () => {
  it("tracks a successful save", () => {
    const session = createDocumentSession("tab-1", "note.md", "draft");
    const saved = markSessionSaved(session, "final", 123);

    expect(saved.status).toBe("saved");
    expect(saved.lastSavedContent).toBe("final");
    expect(saved.lastSavedAt).toBe(123);
  });

  it("keeps external content when a conflict is detected", () => {
    const session = createDocumentSession("tab-1", "note.md", "local");
    const conflicted = markSessionConflict(session, "external");

    expect(conflicted.status).toBe("conflict");
    expect(conflicted.externalContent).toBe("external");
  });
});
