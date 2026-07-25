type SuggestionMenu = {
  openSuggestionMenu: (
    triggerCharacter: string,
    options?: { ignoreQueryLength?: boolean },
  ) => void;
};

export function openQuickEmojiPicker(suggestionMenu: SuggestionMenu) {
  suggestionMenu.openSuggestionMenu(":", { ignoreQueryLength: true });
}
