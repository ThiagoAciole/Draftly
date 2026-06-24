import { isMarkdownPath } from "../features/files/file-types.js";
import type { MarkdownPreview } from "../api/tauri.js";

export interface DocumentLoadCommands {
  openMarkdownPreview(path: string, maxBytes: number): Promise<MarkdownPreview>;
  openMarkdown(path: string): Promise<string>;
  readFile(path: string): Promise<string>;
}

export type LoadedDocument =
  | {
      kind: "markdown";
      initial: { html: string; content: string };
      full?: Promise<{ html: string; content: string }>;
    }
  | {
      kind: "text";
      content: string;
    };

export async function loadDocument(
  path: string,
  commands: DocumentLoadCommands,
  maxPreviewBytes = 50000,
): Promise<LoadedDocument> {
  if (!isMarkdownPath(path)) {
    return {
      kind: "text",
      content: await commands.readFile(path),
    };
  }

  const preview = await commands.openMarkdownPreview(path, maxPreviewBytes);
  const initial = {
    html: preview.html,
    content: preview.content,
  };

  if (preview.isFull) return { kind: "markdown", initial };

  return {
    kind: "markdown",
    initial,
    full: Promise.all([
      commands.openMarkdown(path),
      commands.readFile(path),
    ]).then(([html, content]) => ({ html, content })),
  };
}
