import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Store } from "@tauri-apps/plugin-store";

const STORE_FILENAME = "settings.json";
const STORE_KEY = "user-settings";

export type AppSettings = {
  general: {
    restoreSession: boolean;
    showRecentFiles: boolean;
    autosave: boolean;
  };
  appearance: {
    accentColor: string;
    showTabs: boolean;
    editorFont: "sans" | "serif" | "mono";
    editorFontSize: number;
  };
};

export const DEFAULTS: AppSettings = {
  general: {
    restoreSession: false,
    showRecentFiles: true,
    autosave: false,
  },
  appearance: {
    accentColor: "#8b6cff",
    showTabs: true,
    editorFont: "sans",
    editorFontSize: 18,
  },
};

const FONT_FAMILY_MAP: Record<AppSettings["appearance"]["editorFont"], string> = {
  sans: "Cantarell, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  serif: 'Charter, "Bitstream Charter", "Sitka Text", Cambria, serif',
  mono: '"Cascadia Code", "Fira Code", ui-monospace, SFMono-Regular, Menlo, monospace',
};

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function applyCssVars(s: AppSettings): void {
  const root = document.documentElement;
  root.style.setProperty("--accent", s.appearance.accentColor);
  root.style.setProperty("--accent-soft", hexToRgba(s.appearance.accentColor, 0.18));
  root.style.setProperty("--editor-font", FONT_FAMILY_MAP[s.appearance.editorFont]);
  root.style.setProperty("--editor-font-size", `${s.appearance.editorFontSize}px`);
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export type SettingsContextValue = {
  settings: AppSettings;
  store: Store | null;
  updateSetting: <T>(path: string[], value: T) => Promise<void>;
  resetAll: () => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  const [store, setStore] = useState<Store | null>(null);

  // Apply CSS vars immediately on mount so defaults are live
  useEffect(() => {
    applyCssVars(settings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const s = await Store.load(STORE_FILENAME);
        if (cancelled) return;
        setStore(s);

        const stored = await s.get<AppSettings>(STORE_KEY);
        if (cancelled) return;

        if (stored) {
          const merged = { ...DEFAULTS };
          if (stored.general) merged.general = { ...DEFAULTS.general, ...stored.general };
          if (stored.appearance) merged.appearance = { ...DEFAULTS.appearance, ...stored.appearance };
          setSettings(merged);
          applyCssVars(merged);
        }
      } catch {
        // Store plugin unavailable — use defaults set above
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const updateSetting = async <T,>(path: string[], value: T) => {
    const next = deepClone(settings);
    let obj = next as unknown as Record<string, unknown>;
    for (let i = 0; i < path.length - 1; i++) {
      obj = obj[path[i]] as Record<string, unknown>;
    }
    obj[path[path.length - 1]] = value;

    setSettings(next);
    applyCssVars(next);

    if (store) {
      try {
        await store.set(STORE_KEY, next);
        await store.save();
      } catch {
        // Silently fail — CSS is already applied
      }
    }
  };

  const resetAll = async () => {
    setSettings(DEFAULTS);
    applyCssVars(DEFAULTS);

    if (store) {
      try {
        await store.set(STORE_KEY, DEFAULTS);
        await store.save();
      } catch {
        // Silently fail
      }
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, store, updateSetting, resetAll }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}
