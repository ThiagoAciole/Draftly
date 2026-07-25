export type AiAction = "format" | "correct" | "rewrite" | "organize-selection";

export type AiTextResult = { kind: "text"; text: string };
export type AiResult = AiTextResult;
