import { describe, expect, it } from "vitest";
import {
  resolvePath,
  isYoutubeLink,
  getYoutubeId,
  processMarkdownHtml,
} from "./markdown.processor.js";

describe("markdown processor", () => {
  describe("path resolver", () => {
    it("resolves relative paths correctly", () => {
      expect(resolvePath("C:/notes/main.md", "./images/photo.png")).toBe(
        "C:/notes/images/photo.png",
      );
      expect(resolvePath("C:/notes/main.md", "../avatar.jpg")).toBe(
        "C:/avatar.jpg",
      );
      expect(resolvePath("/home/user/notes/main.md", "images/photo.png")).toBe(
        "/home/user/notes/images/photo.png",
      );
    });

    it("leaves absolute paths intact", () => {
      expect(resolvePath("C:/notes/main.md", "D:/photos/photo.png")).toBe(
        "D:/photos/photo.png",
      );
      expect(resolvePath("/home/user/notes/main.md", "/var/log/app.log")).toBe(
        "/var/log/app.log",
      );
    });
  });

  describe("youtube link utilities", () => {
    it("detects youtube links correctly", () => {
      expect(isYoutubeLink("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
        true,
      );
      expect(isYoutubeLink("https://youtu.be/dQw4w9WgXcQ")).toBe(true);
      expect(isYoutubeLink("https://google.com")).toBe(false);
    });

    it("extracts youtube video id correctly", () => {
      expect(getYoutubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
        "dQw4w9WgXcQ",
      );
      expect(getYoutubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
      expect(getYoutubeId("https://google.com")).toBeNull();
    });
  });

  describe("html processing", () => {
    it("processes blockquote callouts/alerts", () => {
      const rawHtml =
        "<blockquote><p>[!NOTE]<br>This is a note alert.</p></blockquote>";
      const processed = processMarkdownHtml(rawHtml, "note.md", new Set());

      expect(processed).toContain("markdown-alert");
      expect(processed).toContain("markdown-alert-note");
      expect(processed).toContain("markdown-alert-title");
      expect(processed).toContain("This is a note alert.");
    });

    it("processes task checkboxes", () => {
      const rawHtml =
        '<ul><li class="task-list-item"><input type="checkbox"> Task item</li></ul>';
      const processed = processMarkdownHtml(rawHtml, "note.md", new Set());

      expect(processed).toContain("data-task-checkbox");
      expect(processed).toContain("task-text");
      expect(processed).toContain("Task item");
    });

    it("processes block ids", () => {
      const rawHtml = "<p>This is a paragraph ^my-block-id</p>";
      const processed = processMarkdownHtml(rawHtml, "note.md", new Set());

      expect(processed).toContain('class="block-id-anchor"');
      expect(processed).toContain('id="my-block-id"');
    });

    it("processes heading folding", () => {
      const rawHtml = '<h1 id="intro">Intro</h1><p>Paragraph under intro.</p>';
      const processed = processMarkdownHtml(rawHtml, "note.md", new Set());

      expect(processed).toContain("foldable-header");
      expect(processed).toContain("header-fold-icon");
      expect(processed).toContain("foldable-content-wrapper");
    });
  });
});
