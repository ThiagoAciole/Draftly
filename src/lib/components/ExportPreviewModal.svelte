<script lang="ts">
  import { exportAsHtml } from "../utils/export.js";
  import { t } from "../utils/i18n.js";
  import type { LanguageCode } from "../utils/i18n.js";

  let {
    open = $bindable(false),
    htmlContent,
    tabTitle = "Export",
    tabPath = "",
    language = "en" as LanguageCode,
  } = $props<{
    open: boolean;
    htmlContent: string;
    tabTitle?: string;
    tabPath?: string;
    language?: LanguageCode;
  }>();

  let includeStyles = $state(true);
  let contentOnly = $state(false);
  let iframeRef = $state<HTMLIFrameElement>();

  function renderPreview() {
    if (!iframeRef) return;

    const doc = iframeRef.contentDocument;
    if (!doc) return;

    let html = htmlContent;

    if (includeStyles) {
      let styles = "";
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            styles += rule.cssText + "\n";
          }
        } catch {
          // cross-origin sheets
        }
      }

      html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${tabTitle || "Export"}</title>
<style>
${styles}
html, body {
	overflow: auto !important;
	height: auto !important;
	min-height: 100vh;
	background-color: var(--color-canvas-default, #ffffff);
	margin: 0;
	padding: 0;
}
.markdown-body {
	padding: 40px !important;
	max-width: 900px;
	margin: 0 auto;
}
</style>
</head>
<body>
${contentOnly ? '<div class="markdown-body">' + htmlContent + "</div>" : htmlContent}
</body>
</html>`;
    } else {
      html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${tabTitle || "Export"}</title>
<style>
html, body { margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
</style>
</head>
<body>
${contentOnly ? '<div style="max-width: 900px; margin: 0 auto;">' + htmlContent + "</div>" : htmlContent}
</body>
</html>`;
    }

    doc.open();
    doc.write(html);
    doc.close();
  }

  function handleExportHtml() {
    exportAsHtml({
      htmlContent,
      markdownBody: null,
      tabTitle: tabTitle || "export",
      tabPath: tabPath || "export.html",
    });
    open = false;
  }

  function handleExportPdf() {
    if (iframeRef?.contentWindow) {
      iframeRef.contentWindow.print();
    }
    open = false;
  }

  function handleBackdropClick() {
    open = false;
  }

  function handleBackdropKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
      e.preventDefault();
      open = false;
    }
  }

  $effect(() => {
    if (open) {
      renderPreview();
    }
  });

  $effect(() => {
    includeStyles;
    contentOnly;
    if (open) {
      renderPreview();
    }
  });
</script>

{#if open}
  <div class="modal-backdrop" role="presentation">
    <button
      type="button"
      class="backdrop-button"
      onclick={handleBackdropClick}
      onkeydown={handleBackdropKeydown}
      aria-label="Close export preview"
    ></button>
    <div
      class="export-preview-modal"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
    >
      <div class="modal-header">
        <h2>{t("export.preview", language) || "Export Preview"}</h2>
        <button
          type="button"
          class="close-btn"
          aria-label="Close"
          onclick={() => (open = false)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="modal-options">
        <label class="checkbox-label">
          <input type="checkbox" bind:checked={includeStyles} />
          <span>Include styles</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" bind:checked={contentOnly} />
          <span>Content only (no header/footer)</span>
        </label>
      </div>

      <iframe
        bind:this={iframeRef}
        title="Export preview"
        class="preview-iframe"
        sandbox="allow-same-origin"
      ></iframe>

      <div class="modal-footer">
        <button
          type="button"
          class="btn btn-secondary"
          onclick={() => (open = false)}
        >
          {t("common.cancel", language) || "Cancel"}
        </button>
        <button
          type="button"
          class="btn btn-primary"
          onclick={handleExportHtml}
        >
          Export as HTML
        </button>
        <button type="button" class="btn btn-primary" onclick={handleExportPdf}>
          Export as PDF
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 30000;
  }

  .export-preview-modal {
    display: flex;
    flex-direction: column;
    width: 90vw;
    height: 90vh;
    max-width: 1200px;
    max-height: 800px;
    background: var(--color-canvas-default, #ffffff);
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--color-border-muted);
    background: var(--bg-secondary, var(--color-canvas-subtle));
  }

  .modal-header h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary, var(--color-fg-default));
  }

  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: inherit;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .modal-options {
    display: flex;
    gap: 16px;
    padding: 16px 20px;
    border-bottom: 1px solid var(--color-border-muted);
    background: var(--bg-secondary, var(--color-canvas-subtle));
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
  }

  .preview-iframe {
    flex: 1;
    border: none;
    width: 100%;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 20px;
    border-top: 1px solid var(--color-border-muted);
    background: var(--bg-secondary, var(--color-canvas-subtle));
  }

  .btn {
    padding: 10px 16px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-weight: 600;
  }

  .btn-secondary {
    background: var(--bg-secondary, #f3f3f3);
    color: var(--text-secondary, #333);
  }

  .btn-primary {
    background: var(--color-primary, #2563eb);
    color: #fff;
  }
</style>
