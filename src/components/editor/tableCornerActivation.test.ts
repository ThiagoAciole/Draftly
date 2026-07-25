import { describe, expect, it } from "vitest";
import { isPointerInTableCorner } from "./tableCornerActivation";

const rect = { left: 0, top: 0, right: 300, bottom: 180 };

describe("isPointerInTableCorner", () => {
  it("revela o controle de linhas apenas no extremo direito", () => {
    expect(
      isPointerInTableCorner("addOrRemoveRows", { x: 280, y: 186 }, rect),
    ).toBe(true);
    expect(
      isPointerInTableCorner("addOrRemoveRows", { x: 120, y: 186 }, rect),
    ).toBe(false);
  });

  it("revela o controle de colunas apenas no extremo inferior", () => {
    expect(
      isPointerInTableCorner("addOrRemoveColumns", { x: 306, y: 160 }, rect),
    ).toBe(true);
    expect(
      isPointerInTableCorner("addOrRemoveColumns", { x: 306, y: 70 }, rect),
    ).toBe(false);
  });
});
