import { save } from "@tauri-apps/plugin-dialog";
import { tauriCommands } from "../api/tauri.js";

interface ExportContext {
  htmlContent: string;
  markdownBody: HTMLElement | null;
  tabTitle: string;
  tabPath: string;
}

/**
 * Escape HTML attribute values to prevent injection
 */
function escapeHtmlAttribute(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Collect all stylesheet rules from document
 */
function collectStyles(): string {
  let styles = "";
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        styles += rule.cssText + "\n";
      }
    } catch {
      // cross-origin sheets or CORS restrictions
    }
  }
  return styles;
}

/**
 * Generate sanitized HTML for export with CSS isolation
 */
function generateExportHtml(
  title: string,
  content: string,
  includeStyles: boolean = true,
): string {
  const escapedTitle = escapeHtmlAttribute(title || "Export");
  let styles = "";

  if (includeStyles) {
    const collectedStyles = collectStyles();
    styles = `${collectedStyles}
@page {
	margin: 2cm;
	size: auto;
}
@media print {
	html, body {
		overflow: visible !important;
		height: auto !important;
		min-height: 100vh;
	}
}
.draftly-export {
	max-width: 900px;
	margin: 0 auto;
}
.draftly-export .markdown-body {
	padding: 0 !important;
	background: transparent !important;
	color: inherit !important;
}
.draftly-export .markdown-body pre {
	white-space: pre-wrap !important;
	word-break: break-word !important;
	background: rgba(0,0,0,0.05) !important;
	padding: 12px !important;
	border-radius: 4px !important;
}
.draftly-export img,
.draftly-export svg {
	max-width: 100%;
	height: auto;
}
.lang-label,
.hidden {
	display: none !important;
}`;
  } else {
    styles = `
html, body {
	margin: 0;
	padding: 20px;
	font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	font-size: 14px;
	line-height: 1.6;
	color: #333;
}
.draftly-export {
	max-width: 900px;
	margin: 0 auto;
}
.draftly-export img,
.draftly-export svg {
	max-width: 100%;
	height: auto;
}
.hidden {
	display: none !important;
}`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapedTitle}</title>
<style>
${styles}
</style>
</head>
<body>
<div class="draftly-export markdown-body">
${content}
</div>
</body>
</html>`;
}

export async function exportAsHtml(ctx: ExportContext) {
  if (!ctx.htmlContent) return;

  const defaultName = ctx.tabPath
    ? ctx.tabPath.replace(/\.[^.]+$/, ".html")
    : "export.html";

  const selected = await save({
    filters: [{ name: "HTML", extensions: ["html", "htm"] }],
    defaultPath: defaultName,
  });
  if (!selected) return;

  const content = ctx.markdownBody?.innerHTML || ctx.htmlContent;
  const fullHtml = generateExportHtml(ctx.tabTitle || "Export", content, true);

  try {
    await tauriCommands.writeFile(selected, fullHtml);
  } catch (e) {
    console.error("Failed to export HTML", e);
  }
}

export function exportAsPdf() {
  window.print();
}
