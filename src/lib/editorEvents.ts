export const OPEN_SOURCE_SEARCH_EVENT = "draftly:open-source-search";
export const EXPORT_VISUAL_HTML_EVENT = "draftly:export-visual-html";

export function openSourceEditorSearch(): void {
  window.dispatchEvent(new Event(OPEN_SOURCE_SEARCH_EVENT));
}

export function exportVisualHtml(): void {
  window.dispatchEvent(new Event(EXPORT_VISUAL_HTML_EVENT));
}
