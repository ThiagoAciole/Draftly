import { describe, expect, it, vi } from "vitest";
import {
  clearWindowSession,
  flushDirtyFileTabs,
  persistWindowSession,
  restoreWindowSession,
  saveTabsSequentially,
  type WindowSessionStorage,
} from "./window-lifecycle.js";

function createStorage(initial: string | null = null): WindowSessionStorage {
  let value = initial;
  return {
    getItem: () => value,
    setItem: (_key, nextValue) => {
      value = nextValue;
    },
    removeItem: () => {
      value = null;
    },
  };
}

describe("window lifecycle", () => {
  it("restores and persists the window session only when enabled", () => {
    const storage = createStorage("saved state");
    const restore = vi.fn();

    expect(restoreWindowSession(false, storage, restore)).toBe(false);
    expect(restoreWindowSession(true, storage, restore)).toBe(true);
    expect(restore).toHaveBeenCalledWith("saved state");

    expect(persistWindowSession(true, storage, () => "new state")).toBe(true);
    expect(storage.getItem("savedTabsData")).toBe("new state");
  });

  it("clears the persisted session", () => {
    const storage = createStorage("saved state");

    clearWindowSession(storage);

    expect(storage.getItem("savedTabsData")).toBeNull();
  });

  it("flushes only dirty tabs that already have a path", async () => {
    const save = vi.fn().mockResolvedValue(true);
    const cancelPending = vi.fn();

    await flushDirtyFileTabs(
      [
        { id: "dirty", path: "note.md", isDirty: true },
        { id: "untitled", path: "", isDirty: true },
        { id: "clean", path: "clean.md", isDirty: false },
      ],
      { save, cancelPending },
    );

    expect(cancelPending).toHaveBeenCalledWith("dirty");
    expect(save).toHaveBeenCalledWith("dirty");
  });

  it("stops sequential saving after the first failure", async () => {
    const save = vi
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    const result = await saveTabsSequentially(
      [{ id: "one" }, { id: "two" }, { id: "three" }],
      {
        beforeSave: vi.fn(),
        save,
      },
    );

    expect(result).toBe(false);
    expect(save.mock.calls).toEqual([["one"], ["two"]]);
  });
});
