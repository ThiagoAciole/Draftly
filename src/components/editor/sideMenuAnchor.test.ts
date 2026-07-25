// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { getBlockElement, getSideMenuAnchorRect } from "./sideMenuAnchor";

const firstLineRect = new DOMRect(100, 40, 500, 30);
const secondLineRect = new DOMRect(100, 70, 500, 30);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getSideMenuAnchorRect", () => {
  it("usa a primeira linha renderizada de um bloco textual", () => {
    const block = document.createElement("div");
    block.innerHTML = '<div class="bn-block-content"><div class="bn-inline-content">linha um<br>linha dois</div></div>';
    const inlineContent = block.querySelector(".bn-inline-content")!;
    const range = {
      selectNodeContents: vi.fn(),
      getClientRects: () =>
        ({
          0: firstLineRect,
          1: secondLineRect,
          length: 2,
          item: (index: number) => [firstLineRect, secondLineRect][index] ?? null,
        }) as unknown as DOMRectList,
      detach: vi.fn(),
    };
    vi.spyOn(document, "createRange").mockReturnValue(range as unknown as Range);

    expect(getSideMenuAnchorRect(block)).toEqual(firstLineRect);
    expect(range.selectNodeContents).toHaveBeenCalledWith(inlineContent);
    expect(range.detach).toHaveBeenCalledOnce();
  });

  it("usa a caixa do conteúdo quando não há linha de texto", () => {
    const block = document.createElement("div");
    block.innerHTML = '<div class="bn-block-content"></div>';
    const content = block.firstElementChild!;
    const contentRect = new DOMRect(20, 30, 600, 44);
    vi.spyOn(content, "getBoundingClientRect").mockReturnValue(contentRect);

    expect(getSideMenuAnchorRect(block)).toEqual(contentRect);
  });

  it("localiza somente o bloco solicitado", () => {
    const root = document.createElement("div");
    root.innerHTML = '<div class="bn-block" data-id="a"></div><div class="bn-block" data-id="b"></div>';

    expect(getBlockElement("b", root)?.dataset.id).toBe("b");
    expect(getBlockElement("inexistente", root)).toBeNull();
  });
});
