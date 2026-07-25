import { describe, expect, it } from "vitest";
import { buildAiPrompt } from "./prompts";

describe("buildAiPrompt", () => {
  it("pede Markdown estruturado sem inventar conteúdo ao formatar", () => {
    const prompt = buildAiPrompt("format", "notas soltas\nreunião amanhã");

    expect(prompt).toContain("Markdown puro");
    expect(prompt).toContain("Não invente fatos");
    expect(prompt).toContain("notas soltas");
  });

  it("corrige apenas erros no trecho selecionado", () => {
    const prompt = buildAiPrompt("correct", "eu agente fomos ontem");

    expect(prompt).toContain("somente erros ortográficos");
    expect(prompt).toContain("eu agente fomos ontem");
  });

  it("reescreve somente o trecho selecionado", () => {
    const prompt = buildAiPrompt("rewrite", "Planejamento");

    expect(prompt).toContain("somente o trecho selecionado");
    expect(prompt).toContain("outras palavras");
  });
});
