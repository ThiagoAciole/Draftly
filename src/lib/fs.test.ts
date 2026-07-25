import { beforeEach, describe, expect, it, vi } from "vitest";

const tauri = vi.hoisted(() => ({
  invoke: vi.fn(),
  open: vi.fn(),
  save: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({ invoke: tauri.invoke }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: tauri.open, save: tauri.save }));

import {
  getFileName,
  getInitialTextFilePath,
  openTextFile,
  pickTextSavePath,
  readTextFile,
  saveTextFile,
  storeImageAsset,
} from "./fs";

describe("file I/O", () => {
  beforeEach(() => {
    tauri.invoke.mockReset();
    tauri.open.mockReset();
    tauri.save.mockReset();
  });

  it("extrai o nome em caminhos Windows e Linux", () => {
    expect(getFileName("C:\\Notas\\ideias.md")).toBe("ideias.md");
    expect(getFileName("/home/thiago/ideias.md")).toBe("ideias.md");
  });

  it("não tenta ler quando o seletor de abertura é cancelado", async () => {
    tauri.open.mockResolvedValue(null);

    await expect(openTextFile()).resolves.toBeNull();
    expect(tauri.invoke).not.toHaveBeenCalled();
  });

  it("lê o conteúdo e identifica o editor pelo caminho selecionado", async () => {
    tauri.open.mockResolvedValue("C:\\Projetos\\app.ts");
    tauri.invoke.mockResolvedValue("const app = true;");

    await expect(openTextFile()).resolves.toEqual({
      path: "C:\\Projetos\\app.ts",
      name: "app.ts",
      content: "const app = true;",
      language: "typescript",
    });
    expect(tauri.invoke).toHaveBeenCalledWith("read_text_file", {
      path: "C:\\Projetos\\app.ts",
    });
  });

  it("salva conteúdo e consulta o caminho inicial pelo IPC", async () => {
    await saveTextFile("C:\\Notas\\ideias.md", "# Ideias");
    tauri.invoke.mockResolvedValue("C:\\Notas\\inicial.md");

    await expect(getInitialTextFilePath()).resolves.toBe("C:\\Notas\\inicial.md");
    expect(tauri.invoke).toHaveBeenNthCalledWith(1, "write_text_file", {
      path: "C:\\Notas\\ideias.md",
      content: "# Ideias",
    });
    expect(tauri.invoke).toHaveBeenNthCalledWith(2, "get_initial_text_file_path");
  });

  it("usa o filtro único de formatos suportados ao escolher onde salvar", async () => {
    tauri.save.mockResolvedValue("C:\\Notas\\novo.md");

    await expect(pickTextSavePath()).resolves.toBe("C:\\Notas\\novo.md");
    expect(tauri.save).toHaveBeenCalledWith({
      defaultPath: "Untitled.md",
      filters: [
        {
          name: "Arquivos suportados",
          extensions: ["md", "txt", "json", "js", "ts", "py", "html"],
        },
      ],
    });
  });

  it("envia bytes e nome original ao copiar uma imagem para o documento", async () => {
    const file = {
      name: "diagrama.png",
      arrayBuffer: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]).buffer),
    } as unknown as File;
    tauri.invoke.mockResolvedValue({
      relativePath: "images/diagrama.png",
      absolutePath: "C:\\Notas\\images\\diagrama.png",
    });

    await expect(storeImageAsset("C:\\Notas\\ideias.md", file)).resolves.toMatchObject({
      relativePath: "images/diagrama.png",
    });
    expect(tauri.invoke).toHaveBeenCalledWith("store_image_asset", {
      documentPath: "C:\\Notas\\ideias.md",
      fileName: "diagrama.png",
      bytes: [1, 2, 3],
    });
  });

  it("lê diretamente um arquivo quando o caminho já é conhecido", async () => {
    tauri.invoke.mockResolvedValue("# Nota");

    await expect(readTextFile("/tmp/nota.md")).resolves.toMatchObject({
      name: "nota.md",
      language: "markdown",
      content: "# Nota",
    });
  });
});
