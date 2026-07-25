import type { AiAction, AiResult } from "./types";

function removeMarkdownFence(content: string): string {
  const trimmed = content.trim();
  const match = trimmed.match(/^```(?:markdown|md|text)?\s*\n([\s\S]*?)\n?```$/i);
  return (match?.[1] ?? trimmed).trim();
}

export function parseAiResponse(_action: AiAction, content: string): AiResult {
  const text = removeMarkdownFence(content);
  if (!text) throw new Error("A IA não retornou conteúdo.");
  return { kind: "text", text };
}
