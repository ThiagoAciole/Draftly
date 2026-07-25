import { describe, expect, it } from "vitest";
import { replaceLiteralMatch, replaceLiteralMatches } from "./visualSearch";

describe("visual search replacements", () => {
  it("substitui uma ocorrência pelo índice sem diferenciar maiúsculas", () => {
    expect(replaceLiteralMatch("Nota, nota e NOTA", "nota", "ideia", 1)).toEqual({
      content: "Nota, ideia e NOTA",
      replaced: true,
    });
  });

  it("substitui todas as ocorrências literais e informa a quantidade", () => {
    expect(replaceLiteralMatches("Nota, nota e NOTA", "nota", "ideia")).toEqual({
      content: "ideia, ideia e ideia",
      count: 3,
    });
  });
});
