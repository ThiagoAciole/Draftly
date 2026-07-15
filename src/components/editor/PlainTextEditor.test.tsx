// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlainTextEditor } from "./PlainTextEditor";

describe("PlainTextEditor", () => {
  it("keeps Markdown characters as literal plain text", () => {
    const onChange = vi.fn();
    render(<PlainTextEditor content="" onChange={onChange} />);

    fireEvent.change(screen.getByRole("textbox", { name: "Editor de texto simples" }), {
      target: { value: "# Título\n**texto**" },
    });

    expect(onChange).toHaveBeenCalledWith("# Título\n**texto**");
    expect(document.querySelector(".editor-toolbar")).toBeNull();
  });
});
