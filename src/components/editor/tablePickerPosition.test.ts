import { describe, expect, it } from "vitest";
import { getTablePickerPosition } from "./tablePickerPosition";

describe("getTablePickerPosition", () => {
  it("posiciona o seletor abaixo do botão sem ultrapassar a janela", () => {
    expect(
      getTablePickerPosition({ left: 920, bottom: 40, width: 30 }, 1_000),
    ).toEqual({ left: 656, top: 48 });
  });
});
