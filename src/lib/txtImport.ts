import { getFileExtension } from "./languages";

export function isTextImportPath(path: string): boolean {
  return getFileExtension(path) === "txt";
}

export function getTemporaryMarkdownName(fileName: string): string {
  return `${fileName.replace(/\.txt$/i, "") || "Untitled"}.md`;
}
