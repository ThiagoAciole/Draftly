import { invoke } from "@tauri-apps/api/core";

export interface JsonValidationError {
  line: number;
  column: number;
  message: string;
}

export interface JsonValidationResult {
  valid: boolean;
  error?: JsonValidationError;
}

function command<T>(name: string, args?: object): Promise<T> {
  return invoke<T>(name, args as Record<string, unknown> | undefined);
}

export const jsonUtils = {
  /**
   * Format JSON string with pretty printing (2 spaces)
   */
  format: (content: string): Promise<string> =>
    command<string>("format_json", { content }),

  /**
   * Minify JSON string (remove whitespace)
   */
  minify: (content: string): Promise<string> =>
    command<string>("minify_json", { content }),

  /**
   * Validate JSON string and return error details if invalid
   */
  validate: (content: string): Promise<JsonValidationResult> =>
    command<JsonValidationResult>("validate_json", { content }),
};
