export const OPEN_SOURCE_SEARCH_EVENT = "draftly:open-source-search";

export function openSourceEditorSearch(): void {
  window.dispatchEvent(new Event(OPEN_SOURCE_SEARCH_EVENT));
}
