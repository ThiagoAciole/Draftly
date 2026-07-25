import type { AiAction } from "./types";

const SHARED_RULES = `
Responda em português do Brasil.
Preserve fatos, nomes, datas, links, imagens, frontmatter e blocos de código.
Não invente fatos, fontes, compromissos ou conclusões.`.trim();

const INSTRUCTIONS: Record<AiAction, string> = {
  format: "Organize o conteúdo em Markdown puro, com títulos, seções e listas apenas quando fizer sentido.",
  correct: "Corrija somente erros ortográficos, de acentuação, pontuação e concordância no trecho selecionado. Não reescreva, não resuma e não acrescente conteúdo. Retorne apenas o trecho corrigido.",
  rewrite: "Reescreva somente o trecho selecionado com outras palavras, preservando integralmente o sentido, os fatos, o tom e o idioma. Não explique, não resuma e não acrescente conteúdo. Retorne apenas a nova versão do trecho.",
  "organize-selection": "Organize somente este trecho em Markdown puro, preservando seu conteúdo.",
};

export function buildAiPrompt(action: AiAction, content: string): string {
  return `${INSTRUCTIONS[action]}\n\n${SHARED_RULES}\n\nConteúdo:\n${content}`;
}
