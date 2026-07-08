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

function markdownToHtml(markdown: string): string {
  let html = markdown
    // Headings
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr>')
    // Paragraphs (double newlines)
    .replace(/\n\n/g, '</p><p>');

  return `<p>${html}</p>`;
}

export function exportMarkdownToPdf(name: string, markdown: string) {
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${name}</title>
  <style>
    body {
      font-family: Cantarell, system-ui, sans-serif;
      font-size: 14px;
      line-height: 1.7;
      color: #222;
      max-width: 720px;
      margin: 40px auto;
      padding: 0 24px;
    }
    h1 { font-size: 28px; margin-top: 1.5em; }
    h2 { font-size: 22px; margin-top: 1.3em; }
    h3 { font-size: 18px; margin-top: 1.1em; }
    code {
      font-family: "Cascadia Code", monospace;
      font-size: 0.9em;
      background: #f0f0f0;
      padding: 2px 6px;
      border-radius: 4px;
    }
    hr { border: none; border-top: 1px solid #ddd; margin: 2em 0; }
    @media print {
      body { margin: 0; padding: 0 36px; }
    }
  </style>
</head>
<body>${markdownToHtml(markdown)}</body>
</html>`;

  const printWindow = window.open("", "_blank", "width=800,height=600");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}
