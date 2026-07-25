import { describe, expect, it, vi } from "vitest";
import { handleSaveShortcut, handleSelectAllShortcut } from "./editorShortcuts";

describe("handleSelectAllShortcut", () => {
  it("seleciona todo o conteúdo para Ctrl+A dentro do editor", () => {
    const preventDefault = vi.fn();
    const selectAll = vi.fn();

    const handled = handleSelectAllShortcut(
      { ctrlKey: true, metaKey: false, altKey: false, key: "a", preventDefault },
      selectAll,
    );

    expect(handled).toBe(true);
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(selectAll).toHaveBeenCalledOnce();
  });

  it("mantém outros atalhos sob responsabilidade do elemento focado", () => {
    const preventDefault = vi.fn();
    const selectAll = vi.fn();

    const handled = handleSelectAllShortcut(
      { ctrlKey: true, metaKey: false, altKey: false, key: "f", preventDefault },
      selectAll,
    );

    expect(handled).toBe(false);
    expect(preventDefault).not.toHaveBeenCalled();
    expect(selectAll).not.toHaveBeenCalled();
  });
});

describe("handleSaveShortcut", () => {
  it("salva uma única vez para Ctrl+S", () => {
    const preventDefault = vi.fn();
    const save = vi.fn();

    const handled = handleSaveShortcut(
      { ctrlKey: true, metaKey: false, altKey: false, key: "s", preventDefault },
      save,
    );

    expect(handled).toBe(true);
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledOnce();
  });

  it("não trata Ctrl+Shift+S como salvar", () => {
    const preventDefault = vi.fn();
    const save = vi.fn();

    const handled = handleSaveShortcut(
      { ctrlKey: true, metaKey: false, altKey: false, key: "s", shiftKey: true, preventDefault },
      save,
    );

    expect(handled).toBe(false);
    expect(save).not.toHaveBeenCalled();
  });
});
