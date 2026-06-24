import type { DocumentSnapshot } from "./document-session.js";

const RECOVERY_KEY = "draftly.recovery.v1";
const MAX_SNAPSHOTS = 20;

function readSnapshots(storage: Storage): DocumentSnapshot[] {
  try {
    const raw = storage.getItem(RECOVERY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (value): value is DocumentSnapshot =>
        typeof value === "object" &&
        value !== null &&
        typeof (value as DocumentSnapshot).id === "string" &&
        typeof (value as DocumentSnapshot).path === "string" &&
        typeof (value as DocumentSnapshot).title === "string" &&
        typeof (value as DocumentSnapshot).content === "string" &&
        typeof (value as DocumentSnapshot).updatedAt === "number",
    );
  } catch {
    return [];
  }
}

function sameSnapshot(
  left: DocumentSnapshot,
  right: DocumentSnapshot,
): boolean {
  return (
    left.id === right.id &&
    left.path === right.path &&
    left.title === right.title &&
    left.content === right.content
  );
}

function writeSnapshots(
  storage: Storage,
  snapshots: DocumentSnapshot[],
): boolean {
  try {
    if (snapshots.length === 0) {
      storage.removeItem(RECOVERY_KEY);
    } else {
      storage.setItem(RECOVERY_KEY, JSON.stringify(snapshots));
    }
    return true;
  } catch {
    return false;
  }
}

export const recoveryStore = {
  list(storage: Storage = localStorage): DocumentSnapshot[] {
    return readSnapshots(storage).sort((a, b) => b.updatedAt - a.updatedAt);
  },

  save(snapshot: DocumentSnapshot, storage: Storage = localStorage): boolean {
    const snapshots = readSnapshots(storage);
    const previous = snapshots.find((item) => item.id === snapshot.id);
    if (previous && sameSnapshot(previous, snapshot)) return true;

    const next = [
      snapshot,
      ...snapshots.filter((item) => item.id !== snapshot.id),
    ].slice(0, MAX_SNAPSHOTS);

    for (let length = next.length; length >= 1; length -= 1) {
      if (writeSnapshots(storage, next.slice(0, length))) return true;
    }

    return false;
  },

  remove(id: string, storage: Storage = localStorage): void {
    const snapshots = readSnapshots(storage);
    const next = snapshots.filter((item) => item.id !== id);
    if (next.length === snapshots.length) return;
    writeSnapshots(storage, next);
  },

  clear(storage: Storage = localStorage): void {
    writeSnapshots(storage, []);
  },
};
