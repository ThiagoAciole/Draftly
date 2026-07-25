// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let selectedBlocks: Array<Record<string, unknown>> = [];

class ResizeObserverMock {
  observe() {}
  disconnect() {}
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);

vi.mock("@blocknote/react", () => ({
  getDefaultReactSlashMenuItems: () => [],
  useEditorChange: () => undefined,
  useEditorSelectionChange: () => undefined,
  useSelectedBlocks: () => selectedBlocks,
}));

import { EditorToolbar } from "./EditorToolbar";

describe("EditorToolbar", () => {
  afterEach(cleanup);

  beforeEach(() => {
    selectedBlocks = [];
  });

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

  it("recolhe títulos adicionais até o botão de expansão ser acionado", () => {
    const editor = {
      focus: vi.fn(),
      getActiveStyles: () => ({}),
    };

    render(<EditorToolbar editor={editor as never} />);

    expect(screen.queryByRole("button", { name: "Título 4" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Mostrar mais títulos" }));

    expect(screen.getByRole("button", { name: "Título 4" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ocultar títulos adicionais" })).toBeTruthy();
  });

  it("keeps the paragraph control before H1 and moves the toggle after H6 when expanded", () => {
    const editor = {
      focus: vi.fn(),
      getActiveStyles: () => ({}),
    };

    render(<EditorToolbar editor={editor as never} />);

    const paragraph = screen.getByRole("button", { name: "Parágrafo" });
    const heading1 = screen.getByRole("button", { name: "Título 1" });
    expect(paragraph.compareDocumentPosition(heading1) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Mostrar mais títulos" }));

    const heading6 = screen.getByRole("button", { name: "Título 6" });
    const collapse = screen.getByRole("button", { name: "Ocultar títulos adicionais" });
    expect(heading6.compareDocumentPosition(collapse) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("does not expose the toggle-list control in the toolbar", () => {
    const editor = {
      focus: vi.fn(),
      getActiveStyles: () => ({}),
    };

    render(<EditorToolbar editor={editor as never} />);

    expect(screen.queryByRole("button", { name: "Toggle List" })).toBeNull();
  });

  it("transforma todos os blocos selecionados em parágrafo", () => {
    const firstBlock = { id: "first", type: "heading", props: { level: 2 } };
    const secondBlock = { id: "second", type: "quote", props: {} };
    selectedBlocks = [firstBlock, secondBlock];
    const editor = {
      focus: vi.fn(),
      getActiveStyles: () => ({}),
      updateBlock: vi.fn(),
    };

    render(<EditorToolbar editor={editor as never} />);
    fireEvent.click(screen.getByRole("button", { name: "Parágrafo" }));

    expect(editor.updateBlock).toHaveBeenNthCalledWith(1, firstBlock, { type: "paragraph" });
    expect(editor.updateBlock).toHaveBeenNthCalledWith(2, secondBlock, { type: "paragraph" });
  });

  it("transforma o bloco atual em frase de destaque", () => {
    const currentBlock = { id: "current", type: "paragraph", props: {} };
    const editor = {
      focus: vi.fn(),
      getActiveStyles: () => ({}),
      getTextCursorPosition: () => ({ block: currentBlock }),
      updateBlock: vi.fn(),
    };

    render(<EditorToolbar editor={editor as never} />);
    fireEvent.click(screen.getByRole("button", { name: "Frase de destaque" }));

    expect(editor.updateBlock).toHaveBeenCalledWith(currentBlock, {
      type: "callout",
    });
  });

  it("insere a tabela no tamanho escolhido sem substituir o bloco selecionado", () => {
    const selectedBlock = { id: "current", type: "paragraph", props: {} };
    selectedBlocks = [selectedBlock];
    const editor = {
      focus: vi.fn(),
      getActiveStyles: () => ({}),
      insertBlocks: vi.fn(),
      _tiptapEditor: { state: { selection: { empty: true } } },
    };

    render(<EditorToolbar editor={editor as never} />);
    fireEvent.click(screen.getByRole("button", { name: "Tabela" }));
    fireEvent.click(screen.getByRole("button", { name: "2 × 2" }));

    expect(editor.insertBlocks).toHaveBeenCalledWith([
      {
        type: "table",
        content: {
          type: "tableContent",
          rows: [{ cells: ["", ""] }, { cells: ["", ""] }],
        },
      },
    ], selectedBlock, "after");
  });

  it("mostra a prévia do tamanho ao passar pelas células do seletor de tabela", () => {
    const editor = {
      focus: vi.fn(),
      getActiveStyles: () => ({}),
      _tiptapEditor: { state: { selection: { empty: true } } },
    };

    render(<EditorToolbar editor={editor as never} />);
    fireEvent.click(screen.getByRole("button", { name: "Tabela" }));
    fireEvent.mouseEnter(screen.getByRole("button", { name: "2 × 1" }));

    expect(screen.getByText("2 × 1")).toBeTruthy();
  });

  it("oferece conversão apenas para uma seleção tabular completa", () => {
    const firstBlock = { id: "first", type: "paragraph", props: {} };
    const secondBlock = { id: "second", type: "paragraph", props: {} };
    selectedBlocks = [firstBlock, secondBlock];
    const editor = {
      focus: vi.fn(),
      getActiveStyles: () => ({}),
      replaceBlocks: vi.fn(),
      _tiptapEditor: {
        state: {
          selection: {
            empty: false,
            from: 1,
            to: 20,
            $from: { parentOffset: 0 },
            $to: { parentOffset: 8, parent: { content: { size: 8 } } },
          },
          doc: { textBetween: () => "Nome\tPapel\nAna\tDesigner" },
        },
      },
    };

    render(<EditorToolbar editor={editor as never} />);
    fireEvent.click(screen.getByRole("button", { name: "Tabela" }));
    fireEvent.click(screen.getByRole("button", { name: /Converter seleção em tabela/ }));

    expect(editor.replaceBlocks).toHaveBeenCalledWith([firstBlock, secondBlock], [
      {
        type: "table",
        content: {
          type: "tableContent",
          rows: [{ cells: ["Nome", "Papel"] }, { cells: ["Ana", "Designer"] }],
        },
      },
    ]);
  });
});
