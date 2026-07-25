import { invoke } from "@tauri-apps/api/core";
import { buildAiPrompt } from "./prompts";
import { parseAiResponse } from "./response";
import type { AiAction, AiResult } from "./types";

export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";

const MAX_INPUT_CHARACTERS: Record<AiAction, number> = {
  format: 12_000,
  correct: 6_000,
  rewrite: 6_000,
  "organize-selection": 6_000,
};

export type GeminiActionRequest = {
  promise: Promise<AiResult>;
  cancel: () => Promise<void>;
};

const pendingRequests = new Map<string, GeminiActionRequest>();

export function getAiInputLimit(action: AiAction): number {
  return MAX_INPUT_CHARACTERS[action];
}

export function hasGeminiApiKey(): Promise<boolean> {
  return invoke("has_gemini_api_key_in_environment");
}

export function openGeminiEnvironmentSettings(): Promise<void> {
  return invoke("open_gemini_environment_settings");
}

export function startGeminiAction(action: AiAction, content: string, model = DEFAULT_GEMINI_MODEL): GeminiActionRequest {
  const limit = getAiInputLimit(action);
  if (content.length > limit) {
    throw new Error(`Selecione no máximo ${limit.toLocaleString("pt-BR")} caracteres para esta ação de IA.`);
  }

  const key = `${model}\u0000${action}\u0000${content}`;
  const pending = pendingRequests.get(key);
  if (pending) return pending;

  const requestId = crypto.randomUUID();
  const promise = invoke<string>("run_gemini_action", {
    prompt: buildAiPrompt(action, content),
    model,
    requestId,
  })
    .then((response) => parseAiResponse(action, response));
  const request: GeminiActionRequest = {
    promise,
    cancel: async () => {
      if (pendingRequests.get(key) === request) pendingRequests.delete(key);
      await invoke("cancel_gemini_action", { requestId });
    },
  };
  pendingRequests.set(key, request);
  void promise.then(
    () => {
      if (pendingRequests.get(key) === request) pendingRequests.delete(key);
    },
    () => {
      if (pendingRequests.get(key) === request) pendingRequests.delete(key);
    },
  );
  return request;
}

export async function runGeminiAction(action: AiAction, content: string, model = DEFAULT_GEMINI_MODEL): Promise<AiResult> {
  return startGeminiAction(action, content, model).promise;
}
