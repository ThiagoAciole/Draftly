// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { VersionHistoryDialog } from "./VersionHistoryDialog";

describe("VersionHistoryDialog", () => {
  it("restores the selected snapshot", async () => {
    const user = userEvent.setup();
    const snapshot = { id: "v1", content: "# Versão anterior", createdAt: "2026-07-12T10:00:00.000Z" };
    const onRestore = vi.fn();

    render(<VersionHistoryDialog snapshots={[snapshot]} onClose={vi.fn()} onRestore={onRestore} />);
    await user.click(screen.getByRole("button", { name: "Restaurar" }));

    expect(onRestore).toHaveBeenCalledWith(snapshot);
  });
});
