import { open, save } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";

export type MarkdownFile = {
  path: string;
  name: string;
  content: string;
};

const markdownFilters = [
  {
    name: "Markdown",
    extensions: ["md"],
  },
];

export function getFileName(path: string) {
  return path.split(/[\\/]/).pop() || "Untitled.md";
}

export async function readMarkdownFile(path: string): Promise<MarkdownFile> {
  const content = await invoke<string>("read_markdown_file", { path });

  return {
    path,
    name: getFileName(path),
    content,
  };
}

export async function openMarkdownFile(): Promise<MarkdownFile | null> {
  const selected = await open({
    multiple: false,
    filters: markdownFilters,
  });

  if (typeof selected !== "string") {
    return null;
  }

  return readMarkdownFile(selected);
}

export async function pickMarkdownSavePath(defaultPath?: string | null) {
  return save({
    defaultPath: defaultPath || "Untitled.md",
    filters: markdownFilters,
  });
}

export async function saveMarkdownFile(path: string, content: string) {
  await invoke("write_markdown_file", { path, content });
}

export async function getInitialMarkdownFilePath() {
  return invoke<string | null>("get_initial_markdown_file_path");
}
