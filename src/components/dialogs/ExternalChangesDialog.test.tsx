// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ExternalChangesDialog } from "./ExternalChangesDialog";

describe("ExternalChangesDialog", () => {
  it("mostra a comparação antes de recarregar o arquivo", () => {
    const onReload = vi.fn();
    render(
      <ExternalChangesDialog
        fileName="nota.md"
        localContent="meu texto"
        diskContent="texto no disco"
        onKeep={vi.fn()}
        onReload={onReload}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Comparar" }));

    expect(screen.getByText("Minha aba")).toBeTruthy();
    expect(screen.getByText("No disco")).toBeTruthy();
    expect(screen.getByText("meu texto")).toBeTruthy();
    expect(screen.getByText("texto no disco")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Recarregar do disco" }));
    expect(onReload).toHaveBeenCalledOnce();
  });
});
