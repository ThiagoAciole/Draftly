export type ExternalFileChangeResult =
  | { kind: "unchanged" }
  | { kind: "reload"; content: string }
  | { kind: "conflict"; content: string }
  | { kind: "missing" }
  | { kind: "unavailable"; error: unknown };

interface InspectExternalFileChangeOptions {
  path: string;
  originalContent: string;
  isDirty: boolean;
  read: (path: string) => Promise<string>;
}

function isMissingFileError(error: unknown): boolean {
  const message = String(error).toLowerCase();
  return (
    message.includes("cannot find the file") ||
    message.includes("no such file or directory") ||
    message.includes("enoent") ||
    message.includes("os error 2")
  );
}

export async function inspectExternalFileChange({
  path,
  originalContent,
  isDirty,
  read,
}: InspectExternalFileChangeOptions): Promise<ExternalFileChangeResult> {
  try {
    const content = await read(path);
    if (content === originalContent) return { kind: "unchanged" };
    if (isDirty) return { kind: "conflict", content };
    return { kind: "reload", content };
  } catch (error) {
    if (isMissingFileError(error)) return { kind: "missing" };
    return { kind: "unavailable", error };
  }
}
