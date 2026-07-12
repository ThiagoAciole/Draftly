export type VersionSnapshot = {
  id: string;
  content: string;
  createdAt: string;
};

export const VERSION_HISTORY_LIMIT = 10;

export function getVersionHistoryKey(path: string): string {
  return `version-history:${path}`;
}

export function addVersionSnapshot(
  snapshots: VersionSnapshot[],
  content: string,
  createdAt = new Date().toISOString(),
): VersionSnapshot[] {
  if (snapshots[0]?.content === content) return snapshots;

  return [
    { id: `${createdAt}-${Math.random().toString(36).slice(2, 8)}`, content, createdAt },
    ...snapshots,
  ].slice(0, VERSION_HISTORY_LIMIT);
}
