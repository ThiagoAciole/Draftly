const STORAGE_KEY = "recent-files";
const DEFAULT_LIMIT = 9;

export interface RecentFilesStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface RecentFilesStore {
  list(): string[];
  add(path: string): string[];
  remove(path: string): string[];
  rename(oldPath: string, newPath: string): string[];
}

export function createRecentFilesStore(
  storage: RecentFilesStorage,
  limit = DEFAULT_LIMIT,
): RecentFilesStore {
  function list() {
    try {
      const value = JSON.parse(storage.getItem(STORAGE_KEY) ?? "[]");
      if (!Array.isArray(value)) return [];
      return value.filter((path): path is string => typeof path === "string");
    } catch {
      return [];
    }
  }

  function save(paths: string[]) {
    const normalized = [...new Set(paths)].slice(0, limit);
    storage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  }

  return {
    list,
    add: (path) => save([path, ...list().filter((item) => item !== path)]),
    remove: (path) => save(list().filter((item) => item !== path)),
    rename: (oldPath, newPath) =>
      save(list().map((item) => (item === oldPath ? newPath : item))),
  };
}
