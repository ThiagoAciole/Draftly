// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

class ResizeObserverMock {
  observe() {}
  disconnect() {}
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);

vi.mock("@blocknote/react", () => ({
  getDefaultReactSlashMenuItems: () => [],
  useEditorChange: () => undefined,
  useEditorSelectionChange: () => undefined,
  useSelectedBlocks: () => [],
}));

import { EditorToolbar } from "./EditorToolbar";

describe("EditorToolbar", () => {
  it("executa o histórico nativo pelos botões de desfazer e refazer", () => {
    const editor = {
      focus: vi.fn(),
      getActiveStyles: () => ({}),
      undo: vi.fn(),
      redo: vi.fn(),
    };

    render(<EditorToolbar editor={editor as never} />);

    fireEvent.click(screen.getByRole("button", { name: "Desfazer" }));
    fireEvent.click(screen.getByRole("button", { name: "Refazer" }));

    expect(editor.focus).toHaveBeenCalledTimes(2);
    expect(editor.undo).toHaveBeenCalledOnce();
    expect(editor.redo).toHaveBeenCalledOnce();
  });
});
