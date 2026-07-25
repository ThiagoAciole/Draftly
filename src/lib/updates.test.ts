// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

const tauri = vi.hoisted(() => ({
  getVersion: vi.fn(),
  openUrl: vi.fn(),
}));

vi.mock("@tauri-apps/api/app", () => ({ getVersion: tauri.getVersion }));
vi.mock("@tauri-apps/plugin-opener", () => ({ openUrl: tauri.openUrl }));

import { checkForAppUpdate, downloadAppUpdate } from "./updates";

describe("updates", () => {
  beforeEach(() => {
    tauri.getVersion.mockReset();
    tauri.openUrl.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("informa quando ainda não existe release publicada", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 404 }));

    await expect(checkForAppUpdate()).resolves.toEqual({ status: "unpublished" });
    expect(tauri.getVersion).not.toHaveBeenCalled();
  });

  it("não oferece atualização para a mesma versão", async () => {
    tauri.getVersion.mockResolvedValue("0.1.3");
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ tag_name: "v0.1.3", html_url: "https://github.com/release", assets: [] }), { status: 200 }),
    );

    await expect(checkForAppUpdate()).resolves.toEqual({
      status: "current",
      currentVersion: "0.1.3",
    });
  });

  it("escolhe o instalador correto para uma versão nova", async () => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    });
    tauri.getVersion.mockResolvedValue("0.1.3");
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          tag_name: "v0.2.0",
          html_url: "https://github.com/release",
          assets: [
            { name: "Draftly-setup.exe", browser_download_url: "https://github.com/draftly.exe" },
            { name: "Draftly.deb", browser_download_url: "https://github.com/draftly.deb" },
          ],
        }),
        { status: 200 },
      ),
    );

    await expect(checkForAppUpdate()).resolves.toEqual({
      status: "available",
      currentVersion: "0.1.3",
      version: "0.2.0",
      downloadUrl: "https://github.com/draftly.exe",
    });
  });

  it("abre a URL escolhida pelo sistema", async () => {
    await downloadAppUpdate("https://github.com/draftly.exe");

    expect(tauri.openUrl).toHaveBeenCalledWith("https://github.com/draftly.exe");
  });
});
