import { saveDocumentSnapshot } from "./document-save.js";

export interface PersistDocumentOptions {
  path: string;
  content: string;
  getCurrentContent: () => string;
  write: (path: string, content: string) => Promise<void>;
  markSelfWrite: (path: string) => void;
  clearSelfWrite: (path: string) => void;
}

export type PersistDocumentResult =
  | {
      ok: true;
      savedContent: string;
      isDirty: boolean;
    }
  | {
      ok: false;
      error: unknown;
    };

export async function persistDocument({
  path,
  content,
  getCurrentContent,
  write,
  markSelfWrite,
  clearSelfWrite,
}: PersistDocumentOptions): Promise<PersistDocumentResult> {
  markSelfWrite(path);

  try {
    const result = await saveDocumentSnapshot({
      path,
      content,
      getCurrentContent,
      write,
    });
    markSelfWrite(path);
    return { ok: true, ...result };
  } catch (error) {
    clearSelfWrite(path);
    return { ok: false, error };
  }
}
