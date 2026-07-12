import { describe, expect, it } from "vitest";
import { addVersionSnapshot, getVersionHistoryKey, VERSION_HISTORY_LIMIT } from "./versionHistory";

describe("version history", () => {
  it("adds the latest saved content first and avoids consecutive duplicates", () => {
    const first = addVersionSnapshot([], "versão anterior", "2026-07-12T10:00:00.000Z");
    expect(first).toHaveLength(1);
    expect(addVersionSnapshot(first, "versão anterior", "2026-07-12T10:01:00.000Z")).toEqual(first);
  });

  it("keeps only the configured number of snapshots", () => {
    const snapshots = Array.from({ length: VERSION_HISTORY_LIMIT }, (_, index) => ({
      id: String(index), content: String(index), createdAt: `2026-07-12T10:0${index}:00.000Z`,
    }));
    expect(addVersionSnapshot(snapshots, "nova versão")).toHaveLength(VERSION_HISTORY_LIMIT);
  });

  it("uses a path-specific key", () => {
    expect(getVersionHistoryKey("C:/Notas/plano.md")).toBe("version-history:C:/Notas/plano.md");
  });
});
