// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { markdownToPlainText } from "./clipboard";

describe("markdownToPlainText", () => {
  it("remove a formatação Markdown sem perder o conteúdo textual", () => {
    expect(markdownToPlainText("# Título\n\n**Texto** com [link](https://draftly.app)"))
      .toBe("Título\n\nTexto com link");
  });
});
