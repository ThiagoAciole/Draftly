// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AiPreviewDialog } from "./AiPreviewDialog";

describe("AiPreviewDialog", () => {
  it("exibe o estado de geração e permite cancelar a solicitação", () => {
    const onCancel = vi.fn();
    render(
      <AiPreviewDialog
        title="Corrigir com IA"
        result={null}
        isLoading
        onClose={vi.fn()}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByRole("status").textContent).toBe("Gerando…");
    fireEvent.click(screen.getByRole("button", { name: "Cancelar geração" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("destaca o conteúdo removido e adicionado antes de substituir", () => {
    render(
      <AiPreviewDialog
        title="Reescrever"
        originalText="Olá mundo!"
        result={{ kind: "text", text: "Olá Draftly!" }}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("Prévia das alterações")).toBeTruthy();
    expect(document.querySelector("del")?.textContent).toBe("mundo");
    expect(document.querySelector("ins")?.textContent).toBe("Draftly");
  });
});
