import { describe, expect, it } from "vitest";
import {
  createRecentFilesStore,
  type RecentFilesStorage,
} from "./recent-files.js";

function createStorage(initial?: unknown): RecentFilesStorage {
  let value = initial === undefined ? null : JSON.stringify(initial);
  return {
    getItem: () => value,
    setItem: (_key, nextValue) => {
      value = nextValue;
    },
  };
}

describe("createRecentFilesStore", () => {
  it("deduplicates, prioritizes and limits recent files", () => {
    const store = createRecentFilesStore(createStorage(["b.md", "a.md"]), 3);

    store.add("a.md");
    const files = store.add("c.md");
    const limited = store.add("d.md");

    expect(files).toEqual(["c.md", "a.md", "b.md"]);
    expect(limited).toEqual(["d.md", "c.md", "a.md"]);
  });

  it("ignores malformed persisted data", () => {
    const storage: RecentFilesStorage = {
      getItem: () => "{broken",
      setItem: () => undefined,
    };

    expect(createRecentFilesStore(storage).list()).toEqual([]);
  });

  it("removes and renames persisted paths", () => {
    const store = createRecentFilesStore(createStorage(["old.md", "keep.md"]));

    expect(store.rename("old.md", "new.md")).toEqual(["new.md", "keep.md"]);
    expect(store.remove("keep.md")).toEqual(["new.md"]);
  });
});
