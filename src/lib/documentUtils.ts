export type RestorableDocument = {
  id: string;
  path: string | null;
};

export function isDocumentDirty(markdown: string, savedMarkdown: string): boolean {
  return markdown !== savedMarkdown;
}

export function getRestoredActiveTabId<T extends RestorableDocument>(
  tabs: T[],
  activePath: string | null,
): string | null {
  if (!activePath) return null;
  return tabs.find((tab) => tab.path === activePath)?.id ?? null;
}
