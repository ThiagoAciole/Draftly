import { describe, expect, it } from "vitest";
import { parseDelimitedTable } from "./tableConversion";

describe("parseDelimitedTable", () => {
  it("converte linhas TSV em células", () => {
    expect(parseDelimitedTable("Nome\tPapel\nAna\tDesigner"))
      .toEqual([["Nome", "Papel"], ["Ana", "Designer"]]);
  });

  it("aceita CSV e remove espaços ao redor das células", () => {
    expect(parseDelimitedTable("Nome, Papel\nAna, Designer"))
      .toEqual([["Nome", "Papel"], ["Ana", "Designer"]]);
  });

  it("recusa texto livre e linhas com números de colunas diferentes", () => {
    expect(parseDelimitedTable("Uma frase normal\noutra frase normal")).toBeNull();
    expect(parseDelimitedTable("A\tB\nC")).toBeNull();
  });
});
