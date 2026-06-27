import { settings } from "../stores/settings.svelte.js";
import { parseVscodeTheme, applyThemeConfig, clearVscodeTheme } from "../utils/theme.js";
import { tauriCommands } from "../api/tauri.js";

export function createThemeWatcher() {
  let monacoInstance: any = null;

  function registerMonaco(monaco: any) {
    monacoInstance = monaco;
  }

  async function updateTheme(themeName: string) {
    localStorage.setItem("theme", themeName);
    try {
      await tauriCommands.saveTheme(themeName);
    } catch (e) {
      console.error("Failed to save theme in rust backend", e);
    }

    if (themeName === "light" || themeName === "dark") {
      document.documentElement.dataset.theme = themeName;
      document.documentElement.dataset.themeType = themeName;
      clearVscodeTheme();
      if (monacoInstance && monacoInstance.editor) {
        monacoInstance.editor.setTheme(themeName === "dark" ? "vs-dark" : "vs");
      }
    } else {
      // É um tema VS Code importado
      try {
        const themeJson = await tauriCommands.readVscodeTheme(themeName);
        if (themeJson) {
          const config = parseVscodeTheme(themeJson, themeName);
          if (config) {
            applyThemeConfig(config);
          }
        }
      } catch (err) {
        console.error("Failed to load vscode theme", err);
      }
    }
  }

  return {
    registerMonaco,
    updateTheme,
  };
}
