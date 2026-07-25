// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { isCalloutElement } from "./CalloutBlock";

describe("isCalloutElement", () => {
  it("reconhece a frase de destaque salva em Markdown e remove o marcador visual", () => {
    const element = document.createElement("blockquote");
    element.textContent = "💡 Ideia importante";

    expect(isCalloutElement(element)).toBe(true);
    expect(element.textContent).toBe("Ideia importante");
  });
});
