import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { documentFileFilters, getLanguageForPath } from "./languages";
import type { DocumentLanguage } from "./languages";

export type TextFile = {
  path: string;
  name: string;
  content: string;
  language: DocumentLanguage;
};

const pdfFilters = [
  {
    name: "PDF",
    extensions: ["pdf"],
  },
];

export function getFileName(path: string) {
  return path.split(/[\\/]/).pop() || "Untitled.md";
}

export async function readTextFile(path: string): Promise<TextFile> {
  const content = await invoke<string>("read_text_file", { path });

  return {
    path,
    name: getFileName(path),
    content,
    language: getLanguageForPath(path).id,
  };
}

export async function openTextFile(): Promise<TextFile | null> {
  const selected = await open({
    multiple: false,
    filters: documentFileFilters,
  });

  if (typeof selected !== "string") {
    return null;
  }

  return readTextFile(selected);
}

export async function pickTextSavePath(defaultPath?: string | null) {
  return save({
    defaultPath: defaultPath || "Untitled.md",
    filters: documentFileFilters,
  });
}

export async function saveTextFile(path: string, content: string) {
  await invoke("write_text_file", { path, content });
}

export async function getInitialTextFilePath() {
  return invoke<string | null>("get_initial_text_file_path");
}

function getPdfName(name: string) {
  return `${name.replace(/\.md$/i, "") || "Untitled"}.pdf`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function createPdfElement(name: string, markdownHtml: string) {
  const wrapper = document.createElement("div");
  wrapper.className = "draftly-pdf-export-host";
  wrapper.innerHTML = `
    <style>
      .draftly-pdf-export {
        box-sizing: border-box;
        width: 794px;
        min-height: 1123px;
        padding: 64px 72px;
        background: #fffdfb;
        color: #24222a;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 14px;
        line-height: 1.72;
      }

      .draftly-pdf-export * {
        box-sizing: border-box;
      }

      .draftly-pdf-export__title {
        margin: 0 0 28px;
        color: #35236f;
        font-size: 13px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .draftly-pdf-export h1,
      .draftly-pdf-export h2,
      .draftly-pdf-export h3,
      .draftly-pdf-export h4 {
        color: #35236f;
        line-height: 1.18;
        page-break-after: avoid;
      }

      .draftly-pdf-export h1 {
        margin: 0 0 22px;
        font-size: 34px;
        font-weight: 800;
      }

      .draftly-pdf-export h2 {
        margin: 32px 0 12px;
        color: #514196;
        font-size: 24px;
        font-weight: 800;
      }

      .draftly-pdf-export h3 {
        margin: 26px 0 10px;
        color: #4a4558;
        font-size: 18px;
        font-weight: 750;
      }

      .draftly-pdf-export p {
        margin: 0 0 13px;
      }

      .draftly-pdf-export a {
        color: #6750d8;
        text-decoration: none;
        border-bottom: 1px solid rgba(103, 80, 216, 0.32);
      }

      .draftly-pdf-export strong {
        color: #1f1c2a;
        font-weight: 800;
      }

      .draftly-pdf-export em {
        color: #4d4858;
      }

      .draftly-pdf-export ul,
      .draftly-pdf-export ol {
        margin: 8px 0 18px;
        padding-left: 24px;
      }

      .draftly-pdf-export li {
        margin: 5px 0;
        padding-left: 4px;
      }

      .draftly-pdf-export ul li::marker {
        color: #6750d8;
      }

      .draftly-pdf-export ol li::marker {
        color: #6750d8;
        font-weight: 800;
      }

      .draftly-pdf-export li.task-list-item {
        position: relative;
        list-style: none;
        margin-left: -22px;
        padding-left: 30px;
      }

      .draftly-pdf-export input[type="checkbox"] {
        position: absolute;
        left: 0;
        top: 0.42em;
        width: 13px;
        height: 13px;
        margin: 0;
        accent-color: #6750d8;
      }

      .draftly-pdf-export blockquote {
        margin: 18px 0;
        padding: 12px 16px;
        color: #4b405f;
        background: #f5f1ff;
        border-left: 4px solid #6750d8;
        border-radius: 6px;
      }

      .draftly-pdf-export code {
        padding: 2px 5px;
        color: #5b36c8;
        background: #f2effb;
        border-radius: 4px;
        font-family: "Cascadia Code", "SFMono-Regular", Consolas, monospace;
        font-size: 0.9em;
      }

      .draftly-pdf-export pre {
        margin: 18px 0;
        padding: 15px 17px;
        overflow: hidden;
        color: #f4f2fb;
        background: #20202a;
        border-radius: 7px;
        page-break-inside: avoid;
      }

      .draftly-pdf-export pre code {
        padding: 0;
        color: inherit;
        background: transparent;
      }

      .draftly-pdf-export hr {
        height: 1px;
        margin: 28px 0;
        background: #ded8f7;
        border: 0;
      }

      .draftly-pdf-export table {
        width: 100%;
        margin: 18px 0 24px;
        border-collapse: collapse;
        page-break-inside: avoid;
      }

      .draftly-pdf-export th,
      .draftly-pdf-export td {
        padding: 9px 11px;
        border: 1px solid #ded8f7;
        text-align: left;
        vertical-align: top;
      }

      .draftly-pdf-export th {
        color: #35236f;
        background: #f1edff;
        font-weight: 800;
      }

      .draftly-pdf-export tr:nth-child(even) td {
        background: #fbfaff;
      }
    </style>
    <article class="draftly-pdf-export">
      <div class="draftly-pdf-export__title">${escapeHtml(name.replace(/\.md$/i, ""))}</div>
      ${markdownHtml}
    </article>
  `;

  wrapper.style.position = "fixed";
  wrapper.style.left = "-10000px";
  wrapper.style.top = "0";
  wrapper.style.width = "794px";
  wrapper.style.pointerEvents = "none";

  return wrapper;
}

export async function exportMarkdownToPdf(name: string, markdown: string) {
  const [{ default: DOMPurify }, { default: html2pdf }, { marked }] = await Promise.all([
    import("dompurify"),
    import("html2pdf.js"),
    import("marked"),
  ]);
  const targetPath = await save({
    defaultPath: getPdfName(name),
    filters: pdfFilters,
  });

  if (!targetPath) return;

  const markdownHtml = await marked.parse(markdown || " ", {
    async: false,
    breaks: false,
    gfm: true,
  });
  const safeMarkdownHtml = DOMPurify.sanitize(markdownHtml, {
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|data:image\/(?:png|gif|jpe?g|webp);base64,)/i,
  });
  const pdfElement = createPdfElement(name, safeMarkdownHtml);
  document.body.appendChild(pdfElement);

  try {
    const pdfOptions = {
      filename: getPdfName(name),
      margin: 0,
      image: { type: "jpeg", quality: 0.98 },
      enableLinks: true,
      pagebreak: {
        mode: ["css", "legacy"],
        avoid: ["pre", "table", "blockquote", "h1", "h2", "h3"],
      },
      html2canvas: {
        scale: 2,
        backgroundColor: "#fffdfb",
        useCORS: true,
      },
      jsPDF: {
        unit: "pt",
        format: "a4",
        orientation: "portrait",
      },
    } as Parameters<typeof html2pdf>[1] & {
      pagebreak: unknown;
    };

    const pdfBuffer = await html2pdf()
      .set(pdfOptions)
      .from(pdfElement.querySelector(".draftly-pdf-export") as HTMLElement)
      .outputPdf("arraybuffer");

    await invoke("write_pdf_file", {
      path: targetPath,
      bytes: Array.from(new Uint8Array(pdfBuffer)),
    });
  } finally {
    pdfElement.remove();
  }
}
