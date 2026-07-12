// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Home } from "./Home";

const recentFiles = [{ path: "C:/Notas/plano.md", name: "plano.md", openedAt: "2026-07-12T10:00:00.000Z" }];

describe("Home", () => {
  it("lets the user clear and remove recent files", async () => {
    const user = userEvent.setup();
    const onClearRecent = vi.fn();
    const onRemoveRecent = vi.fn();

    render(
      <Home
        recentFiles={recentFiles}
        isBusy={false}
        onCreate={vi.fn()}
        onOpen={vi.fn()}
        onOpenRecent={async () => true}
        onClearRecent={onClearRecent}
        onRemoveRecent={onRemoveRecent}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Limpar" }));
    await user.click(screen.getByRole("button", { name: "Remover plano.md dos recentes" }));

    expect(onClearRecent).toHaveBeenCalledOnce();
    expect(onRemoveRecent).toHaveBeenCalledWith("C:/Notas/plano.md");
  });
});
