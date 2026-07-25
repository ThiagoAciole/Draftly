// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { WorkspaceProvider, useWorkspace } from "./WorkspaceContext";

function WorkspaceProbe() {
  const workspace = useWorkspace();

  return (
    <>
      <output data-testid="state">
        {JSON.stringify({
          error: workspace.error,
          settings: workspace.isSettingsOpen,
          search: workspace.isSearchOpen,
          palette: workspace.isCommandPaletteOpen,
          outline: workspace.isOutlineOpen,
          mode: workspace.editorMode,
        })}
      </output>
      <button onClick={() => workspace.setError("Falha ao salvar")}>erro</button>
      <button onClick={workspace.clearError}>limpar erro</button>
      <button onClick={workspace.openSettings}>configurações</button>
      <button onClick={workspace.openSearch}>buscar</button>
      <button onClick={workspace.openCommandPalette}>comandos</button>
      <button onClick={workspace.toggleOutline}>sumário</button>
      <button onClick={workspace.toggleEditorMode}>modo</button>
    </>
  );
}

function readState() {
  return JSON.parse(screen.getByTestId("state").textContent ?? "{}") as Record<string, unknown>;
}

describe("WorkspaceContext", () => {
  afterEach(cleanup);

  it("controla os painéis independentes e limpa mensagens de erro", () => {
    render(
      <WorkspaceProvider>
        <WorkspaceProbe />
      </WorkspaceProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "erro" }));
    fireEvent.click(screen.getByRole("button", { name: "configurações" }));
    fireEvent.click(screen.getByRole("button", { name: "comandos" }));
    fireEvent.click(screen.getByRole("button", { name: "sumário" }));

    expect(readState()).toMatchObject({
      error: "Falha ao salvar",
      settings: true,
      palette: true,
      outline: true,
    });

    fireEvent.click(screen.getByRole("button", { name: "limpar erro" }));
    expect(readState()).toMatchObject({ error: null });
  });

  it("fecha a busca ao alternar entre editor visual e fonte", () => {
    render(
      <WorkspaceProvider>
        <WorkspaceProbe />
      </WorkspaceProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "buscar" }));
    expect(readState()).toMatchObject({ search: true, mode: "visual" });

    fireEvent.click(screen.getByRole("button", { name: "modo" }));
    expect(readState()).toMatchObject({ search: false, mode: "source" });
  });
});
