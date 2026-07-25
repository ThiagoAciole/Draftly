import { describe, expect, it, vi } from "vitest";
import { openQuickEmojiPicker } from "./quickEmoji";

describe("openQuickEmojiPicker", () => {
  it("abre o picker nativo sem exigir uma busca iniciada por dois caracteres", () => {
    const suggestionMenu = { openSuggestionMenu: vi.fn() };

    openQuickEmojiPicker(suggestionMenu);

    expect(suggestionMenu.openSuggestionMenu).toHaveBeenCalledWith(":", {
      ignoreQueryLength: true,
    });
  });
});
