import { describe, expect, it } from "vitest";
import { createHtmlDocument } from "./htmlExport";

describe("createHtmlDocument", () => {
  it("envolve o HTML dos blocos em um documento portátil com título seguro", () => {
    expect(createHtmlDocument('Notas & "ideias".md', "<p>Conteúdo</p>")).toContain(
      '<title>Notas &amp; &quot;ideias&quot;</title>',
    );
    expect(createHtmlDocument("Notas.md", "<p>Conteúdo</p>")).toContain("<body>\n<p>Conteúdo</p>\n</body>");
  });
});
