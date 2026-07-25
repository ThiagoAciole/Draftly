import { describe, expect, it } from "vitest";
import { getResizedEditorCanvasWidth } from "./editorCanvasWidth";

describe("getResizedEditorCanvasWidth", () => {
  it("aumenta a largura ao arrastar a alça direita", () => {
    expect(getResizedEditorCanvasWidth(800, 120, "right", 1_000)).toBe(920);
  });

  it("aumenta a largura ao arrastar a alça esquerda para fora", () => {
    expect(getResizedEditorCanvasWidth(800, -120, "left", 1_000)).toBe(920);
  });

  it("respeita os limites mínimo e máximo", () => {
    expect(getResizedEditorCanvasWidth(800, -500, "right", 1_000)).toBe(560);
    expect(getResizedEditorCanvasWidth(800, 500, "right", 900)).toBe(900);
  });
});
