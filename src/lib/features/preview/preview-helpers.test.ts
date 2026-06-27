import { describe, expect, it } from "vitest";
import {
  isYoutubeLink,
  getYoutubeId,
  convertInlineMathDelimiters,
} from "./preview-helpers.js";

describe("preview-helpers", () => {
  describe("isYoutubeLink", () => {
    it("returns true for valid YouTube URLs", () => {
      expect(isYoutubeLink("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
      expect(isYoutubeLink("https://youtu.be/dQw4w9WgXcQ")).toBe(true);
    });

    it("returns false for non-YouTube URLs", () => {
      expect(isYoutubeLink("https://google.com")).toBe(false);
      expect(isYoutubeLink("https://youtube.com/about")).toBe(false);
    });
  });

  describe("getYoutubeId", () => {
    it("extracts ID from standard watch URL", () => {
      expect(getYoutubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    });

    it("extracts ID from short youtu.be URL", () => {
      expect(getYoutubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    });

    it("returns null for invalid URLs", () => {
      expect(getYoutubeId("https://google.com")).toBe(null);
    });
  });

  describe("convertInlineMathDelimiters", () => {
    it("converts simple inline math delimiters", () => {
      expect(convertInlineMathDelimiters("This is $E=mc^2$ inline math.")).toBe(
        "This is \\(E=mc^2\\) inline math."
      );
    });

    it("ignores escaped dollars", () => {
      expect(convertInlineMathDelimiters("We have \\$100 dollars.")).toBe(
        "We have \\$100 dollars."
      );
    });

    it("ignores dollar signs followed by space", () => {
      expect(convertInlineMathDelimiters("We have $ 100 dollars.")).toBe(
        "We have $ 100 dollars."
      );
    });
  });
});
