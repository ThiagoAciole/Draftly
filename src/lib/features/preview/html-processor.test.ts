import { describe, expect, it, vi } from "vitest";
import { processHtmlPreview } from "./markdown.processor.js";

// Mock Tauri APIs
vi.mock("@tauri-apps/api/core", () => ({
  convertFileSrc: (path: string) => `tauri-protocol://${path}`,
}));

describe("processHtmlPreview", () => {
  it("resolves local media paths (images, videos, audio)", () => {
    // Nota: O processHtmlPreview mapeia tags <img> com src contendo extensão .mp4 ou .mp3
    // para tags <video> e <audio> respectivamente, se src for correspondente.
    const rawHtml = `
      <div>
        <img src="local-image.png" />
        <img src="clip.mp4" />
        <img src="sound.mp3" />
        <img src="https://example.com/external.png" />
      </div>
    `;
    const processed = processHtmlPreview(rawHtml, "C:/docs/index.html");

    expect(processed).toContain("tauri-protocol://C:/docs/local-image.png");
    expect(processed).toContain("tauri-protocol://C:/docs/clip.mp4");
    expect(processed).toContain("tauri-protocol://C:/docs/sound.mp3");
    expect(processed).toContain("src=\"https://example.com/external.png\"");
    expect(processed).toContain("<video");
    expect(processed).toContain("<audio");
  });

  it("sanitizes dangerous elements and attributes (DOMPurify)", () => {
    const rawHtml = `
      <div>
        <script>alert('hack')</script>
        <p onclick="alert('hack')">Hello</p>
        <iframe src="https://malicious.site" allow="autoplay"></iframe>
      </div>
    `;
    const processed = processHtmlPreview(rawHtml, "C:/docs/index.html");

    expect(processed).not.toContain("<script>");
    expect(processed).not.toContain("onclick");
    expect(processed).toContain("iframe");
    expect(processed).toContain("allow=\"autoplay\"");
    expect(processed).toContain("Hello");
  });

  it("handles empty or blank content gracefully", () => {
    expect(processHtmlPreview("", "C:/docs/index.html")).toBe("");
  });
});
