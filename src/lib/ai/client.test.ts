import { beforeEach, describe, expect, it, vi } from "vitest";

const tauri = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke: tauri.invoke }));

import { getAiInputLimit, hasGeminiApiKey, openGeminiEnvironmentSettings, runGeminiAction, startGeminiAction } from "./client";

describe("Gemini client", () => {
  beforeEach(() => tauri.invoke.mockReset());

  it("consulta a chave somente no ambiente do processo nativo", async () => {
    tauri.invoke.mockResolvedValue(true);
    await expect(hasGeminiApiKey()).resolves.toBe(true);
    expect(tauri.invoke).toHaveBeenCalledWith("has_gemini_api_key_in_environment");
  });

  it("envia uma ação sem expor a chave", async () => {
    tauri.invoke.mockResolvedValue("# Nota");
    await expect(runGeminiAction("format", "nota")).resolves.toEqual({ kind: "text", text: "# Nota" });
    expect(tauri.invoke).toHaveBeenCalledWith("run_gemini_action", expect.objectContaining({ prompt: expect.stringContaining("nota"), model: "gemini-3.5-flash-lite" }));
  });

  it("reaproveita uma solicitação idêntica enquanto ela ainda está em andamento", async () => {
    let resolveResponse!: (value: string) => void;
    const response = new Promise<string>((resolve) => {
      resolveResponse = resolve;
    });
    tauri.invoke.mockReturnValue(response);

    const first = runGeminiAction("rewrite", "Trecho selecionado");
    const second = runGeminiAction("rewrite", "Trecho selecionado");
    expect(tauri.invoke).toHaveBeenCalledTimes(1);
    resolveResponse("Novo trecho");

    await expect(Promise.all([first, second])).resolves.toEqual([
      { kind: "text", text: "Novo trecho" },
      { kind: "text", text: "Novo trecho" },
    ]);
  });

  it("cancela uma solicitaÃ§Ã£o pendente no processo nativo", async () => {
    let rejectResponse!: (error: Error) => void;
    const response = new Promise<string>((_, reject) => {
      rejectResponse = reject;
    });
    tauri.invoke.mockImplementation((command: string) => {
      if (command === "run_gemini_action") return response;
      if (command === "cancel_gemini_action") return Promise.resolve(true);
    });

    const request = startGeminiAction("correct", "trecho");
    await request.cancel();

    expect(tauri.invoke).toHaveBeenCalledWith(
      "cancel_gemini_action",
      expect.objectContaining({ requestId: expect.any(String) }),
    );
    const retry = startGeminiAction("correct", "trecho");
    expect(tauri.invoke).toHaveBeenCalledWith(
      "run_gemini_action",
      expect.objectContaining({ requestId: expect.any(String) }),
    );
    expect(tauri.invoke.mock.calls.filter(([command]) => command === "run_gemini_action")).toHaveLength(2);
    rejectResponse(new Error("cancelada"));
    await expect(request.promise).rejects.toThrow("cancelada");
    await expect(retry.promise).rejects.toThrow("cancelada");
  });

  it("recusa um trecho selecionado maior que o limite editorial", async () => {
    await expect(runGeminiAction("correct", "a".repeat(6_001))).rejects.toThrow("6.000 caracteres");
    expect(tauri.invoke).not.toHaveBeenCalled();
  });

  it("expõe o limite específico de cada ação para a interface", () => {
    expect(getAiInputLimit("format")).toBe(12_000);
    expect(getAiInputLimit("rewrite")).toBe(6_000);
  });

  it("abre o painel nativo de variáveis de ambiente", async () => {
    await openGeminiEnvironmentSettings();
    expect(tauri.invoke).toHaveBeenCalledWith("open_gemini_environment_settings");
  });
});
