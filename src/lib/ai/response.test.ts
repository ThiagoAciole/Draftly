import { describe, expect, it } from "vitest";
import { parseAiResponse } from "./response";

describe("parseAiResponse", () => {
  it("remove cercas Markdown de uma resposta de formatação", () => {
    expect(parseAiResponse("format", "```markdown\n# Planejamento\n```")).toEqual({
      kind: "text",
      text: "# Planejamento",
    });
  });

  it("mantém o texto corrigido como conteúdo substituível", () => {
    expect(parseAiResponse("correct", "Nós fomos ontem.")).toEqual({
      kind: "text",
      text: "Nós fomos ontem.",
    });
  });

  it("rejeita resposta vazia", () => {
    expect(() => parseAiResponse("rewrite", "   ")).toThrow("A IA não retornou conteúdo");
  });
});
