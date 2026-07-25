// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StatusBar } from "./StatusBar";

vi.mock("../../contexts/TabsContext", () => ({
  useTabsContext: () => ({
    activeTab: {
      isDirty: false,
      lastSavedAt: null,
      language: "markdown",
      path: "C:\\Notas\\ideias.md",
    },
  }),
}));

describe("StatusBar", () => {
  it("exibe o erro e permite dispensá-lo", () => {
    const onClearError = vi.fn();
    render(
      <StatusBar
        error="Salve o arquivo Markdown antes de adicionar imagens locais."
        onClearError={onClearError}
      />,
    );

    fireEvent.click(screen.getByRole("alert"));

    expect(onClearError).toHaveBeenCalledOnce();
  });
});
