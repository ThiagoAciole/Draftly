export interface SaveDocumentSnapshotOptions {
  path: string;
  content: string;
  getCurrentContent: () => string;
  write: (path: string, content: string) => Promise<void>;
}

export interface SaveDocumentSnapshotResult {
  savedContent: string;
  isDirty: boolean;
}

export async function saveDocumentSnapshot({
  path,
  content,
  getCurrentContent,
  write,
}: SaveDocumentSnapshotOptions): Promise<SaveDocumentSnapshotResult> {
  await write(path, content);

  return {
    savedContent: content,
    isDirty: getCurrentContent() !== content,
  };
}
