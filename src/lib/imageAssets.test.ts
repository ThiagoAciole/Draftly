import { describe, expect, it } from "vitest";
import {
  getImageAssetAbsolutePath,
  isImportableImage,
  isRelativeImagePath,
} from "./imageAssets";

describe("imageAssets", () => {
  it("resolve a imagem relativa na pasta do Markdown", () => {
    expect(
      getImageAssetAbsolutePath(
        "C:\\Notas\\projeto.md",
        "images\\diagrama.png",
      ),
    ).toBe("C:\\Notas\\images\\diagrama.png");
  });

  it("aceita apenas arquivos de imagem para importação", () => {
    expect(isImportableImage({ name: "foto.png", type: "image/png" })).toBe(true);
    expect(isImportableImage({ name: "notas.pdf", type: "application/pdf" })).toBe(false);
  });

  it("diferencia caminhos de imagem relativos de URLs externas", () => {
    expect(isRelativeImagePath("images/foto.png")).toBe(true);
    expect(isRelativeImagePath("https://exemplo.com/foto.png")).toBe(false);
    expect(isRelativeImagePath("data:image/png;base64,abc")).toBe(false);
  });
});
