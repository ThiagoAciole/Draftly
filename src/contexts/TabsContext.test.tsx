// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/fs", () => ({
  getFileName: (path: string) => path.split(/[\\/]/).at(-1) ?? path,
}));

import { TabsProvider, useTabsContext } from "./TabsContext";
import { WorkspaceProvider, useWorkspace } from "./WorkspaceContext";

function TabsProbe() {
  const tabs = useTabsContext();
  const workspace = useWorkspace();
  const activeId = tabs.activeTabId;

  return (
    <>
      <output data-testid="state">
        {JSON.stringify({
          activeId,
          tabCount: tabs.tabs.length,
          activeName: tabs.activeTab?.name ?? null,
          dirty: tabs.activeTab?.isDirty ?? false,
          view: workspace.view,
          recent: tabs.recentFiles.map((file) => file.name),
        })}
      </output>
      <button
        onClick={() => {
          tabs.addTab(tabs.createBlankTab());
          workspace.setView("editor");
        }}
      >
        nova aba
      </button>
      <button onClick={() => tabs.updateActiveMarkdown("conteúdo editado")}>editar</button>
      <button onClick={() => activeId && tabs.closeTabById(activeId)}>fechar ativa</button>
      <button onClick={() => tabs.addRecentFile("C:\\Notas\\ideias.md")}>recente</button>
      <button onClick={() => tabs.addRecentFile("/tmp/outra.md")}>outro recente</button>
    </>
  );
}

function readState() {
  return JSON.parse(screen.getByTestId("state").textContent ?? "{}") as {
    activeId: string | null;
    tabCount: number;
    activeName: string | null;
    dirty: boolean;
    view: string;
    recent: string[];
  };
}

function renderTabs() {
  return render(
    <WorkspaceProvider>
      <TabsProvider>
        <TabsProbe />
      </TabsProvider>
    </WorkspaceProvider>,
  );
}

describe("TabsContext", () => {
  afterEach(cleanup);

  beforeEach(() => {
    window.localStorage.clear();
  });

  it("marca apenas a aba ativa como não salva após edição", () => {
    renderTabs();

    fireEvent.click(screen.getByRole("button", { name: "nova aba" }));
    fireEvent.click(screen.getByRole("button", { name: "editar" }));

    expect(readState()).toMatchObject({ tabCount: 1, dirty: true, activeName: "Untitled.md" });
  });

  it("retorna para Home somente ao fechar a última aba", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    renderTabs();

    fireEvent.click(screen.getByRole("button", { name: "nova aba" }));
    fireEvent.click(screen.getByRole("button", { name: "nova aba" }));
    fireEvent.click(screen.getByRole("button", { name: "fechar ativa" }));

    expect(readState()).toMatchObject({ tabCount: 1, view: "editor" });

    fireEvent.click(screen.getByRole("button", { name: "fechar ativa" }));
    expect(readState()).toMatchObject({ tabCount: 0, activeId: null, view: "home" });
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("mantém a lista recente sem duplicar o mesmo caminho", () => {
    renderTabs();

    fireEvent.click(screen.getByRole("button", { name: "recente" }));
    fireEvent.click(screen.getByRole("button", { name: "outro recente" }));
    fireEvent.click(screen.getByRole("button", { name: "recente" }));

    expect(readState().recent).toEqual(["ideias.md", "outra.md"]);
  });
});
