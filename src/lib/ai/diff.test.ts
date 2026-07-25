import { describe, expect, it } from "vitest";
import { getTextDiff } from "./diff";

describe("getTextDiff", () => {
  it("separa o trecho removido e o trecho adicionado sem repetir o contexto", () => {
    expect(getTextDiff("Olá mundo!", "Olá Draftly!")).toEqual({
      before: "Olá ",
      removed: "mundo",
      added: "Draftly",
      after: "!",
    });
  });

  it("não marca diferenças quando os textos são iguais", () => {
    expect(getTextDiff("Texto", "Texto")).toEqual({
      before: "Texto",
      removed: "",
      added: "",
      after: "",
    });
  });
});
