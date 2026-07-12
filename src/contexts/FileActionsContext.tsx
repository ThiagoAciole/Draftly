import { confirm } from "@tauri-apps/plugin-dialog";
import { createContext, useContext, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import {
  getFileName,
  getInitialMarkdownFilePath,
  openMarkdownFile,
  pickMarkdownSavePath,
  readMarkdownFile,
  saveMarkdownFile,
  exportMarkdownToPdf,
} from "../lib/fs";
import { useTabsContext } from "./TabsContext";
import type { DocumentTab } from "./TabsContext";
import { useWorkspace } from "./WorkspaceContext";
import { useSettings } from "./SettingsContext";

type FileActionsContextValue = {
  initializeWorkspace: () => Promise<void>;
  createDocument: () => void;
  openDocument: () => Promise<void>;
  openDocumentFromPath: (path: string) => Promise<void>;
  saveDocument: () => Promise<void>;
  saveDocumentAs: () => Promise<void>;
  exportDocumentPdf: () => Promise<void>;
  closeDocument: (id: string) => Promise<boolean>;
  canCloseApp: () => Promise<boolean>;
};

async function confirmDiscardTabs(tabs: DocumentTab[]): Promise<boolean> {
  const dirty = tabs.filter((t) => t.isDirty);
  if (dirty.length === 0) return true;

  const message =
    dirty.length === 1
      ? `Descartar alterações não salvas em "${dirty[0].name}"?`
      : `Descartar alterações não salvas em ${dirty.length} arquivos?`;

  try {
    return await confirm(message, {
      title: "Descartar alterações?",
      kind: "warning",
      okLabel: "Descartar",
      cancelLabel: "Cancelar",
    });
  } catch {
    return window.confirm(message);
  }
}

const SESSION_KEY = "last-session";

type SessionData = {
  paths: string[];
  activeTabPath: string | null;
};

const FileActionsContext = createContext<FileActionsContextValue | null>(null);

export function FileActionsProvider({ children }: { children: ReactNode }) {
  const { setView, setIsBusy, setError } = useWorkspace();
  const { tabs, activeTab, activeTabId, createBlankTab, addTab, addRecentFile, closeTabById, replaceTab, switchTab } =
    useTabsContext();
  const { settings, store } = useSettings();
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;

  // Autosave: every 30s, save dirty tabs that have a path
  useEffect(() => {
    if (!settings.general.autosave) return;

    const autosave = async () => {
      const dirtyTabs = tabsRef.current.filter((t) => t.isDirty && t.path);
      for (const tab of dirtyTabs) {
        try {
          await saveMarkdownFile(tab.path!, tab.markdown);
          replaceTab({
            ...tab,
            savedMarkdown: tab.markdown,
            isDirty: false,
            lastSavedAt: new Date(),
          });
        } catch {
          // Silently skip — autosave failures shouldn't disrupt the user
        }
      }
    };

    const id = window.setInterval(autosave, 30_000);
    return () => window.clearInterval(id);
  }, [settings.general.autosave, replaceTab]);

  // Persist session on beforeunload
  useEffect(() => {
    const saveSession = async () => {
      if (!settings.general.restoreSession || !store) return;
      try {
        const paths = tabsRef.current.map((t) => t.path).filter(Boolean) as string[];
        if (paths.length === 0) {
          await store.delete(SESSION_KEY);
        } else {
          await store.set(SESSION_KEY, { paths, activeTabPath: activeTabId ? tabsRef.current.find((t) => t.id === activeTabId)?.path ?? null : null });
        }
        await store.save();
      } catch {
        // Silently ignore
      }
    };

    window.addEventListener("beforeunload", saveSession);
    return () => window.removeEventListener("beforeunload", saveSession);
  }, [settings.general.restoreSession, activeTabId, store]);

  const initializeWorkspace = async () => {
    setIsBusy(true);
    setError(null);
    try {
      const initialPath = await getInitialMarkdownFilePath();

      // Session restore takes precedence over CLI args
      if (settings.general.restoreSession && !initialPath && store) {
        try {
          const session = await store.get<SessionData>(SESSION_KEY);
          if (session?.paths?.length) {
            let restoredActiveTabId: string | null = null;
            for (const path of session.paths) {
              try {
                const file = await readMarkdownFile(path);
                const tab = {
                  ...createBlankTab(),
                  path: file.path,
                  name: file.name,
                  markdown: file.content,
                  savedMarkdown: file.content,
                };
                addTab(tab);
                if (file.path === session.activeTabPath) restoredActiveTabId = tab.id;
                addRecentFile(file.path);
              } catch {
                // Skip files that no longer exist or can't be read
              }
            }
            if (restoredActiveTabId) switchTab(restoredActiveTabId);
            else setView("editor");
            return;
          }
        } catch {
          // Fall through to default behavior
        }
      }

      if (!initialPath) {
        setView("home");
        return;
      }
      const file = await readMarkdownFile(initialPath);
      const tab = {
        ...createBlankTab(),
        path: file.path,
        name: file.name,
        markdown: file.content,
        savedMarkdown: file.content,
      };
      addTab(tab);
      addRecentFile(file.path);
      setView("editor");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível abrir o arquivo inicial.");
      setView("home");
    } finally {
      setIsBusy(false);
    }
  };

  const createDocument = () => {
    const tab = createBlankTab();
    addTab(tab);
    setView("editor");
    setError(null);
  };

  const openDocument = async () => {
    setIsBusy(true);
    setError(null);
    try {
      const file = await openMarkdownFile();
      if (!file) return;

      const existing = tabs.find((t) => t.path === file.path);
      if (existing) {
        addRecentFile(file.path);
        switchTab(existing.id);
        return;
      }

      const tab = {
        ...createBlankTab(),
        path: file.path,
        name: file.name,
        markdown: file.content,
        savedMarkdown: file.content,
      };
      addTab(tab);
      addRecentFile(file.path);
      setView("editor");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível abrir o arquivo.");
    } finally {
      setIsBusy(false);
    }
  };

  const openDocumentFromPath = async (path: string) => {
    setIsBusy(true);
    setError(null);
    try {
      const file = await readMarkdownFile(path);
      const existing = tabs.find((t) => t.path === file.path);
      if (existing) {
        addRecentFile(file.path);
        switchTab(existing.id);
        return;
      }
      const tab = {
        ...createBlankTab(),
        path: file.path,
        name: file.name,
        markdown: file.content,
        savedMarkdown: file.content,
      };
      addTab(tab);
      addRecentFile(file.path);
      setView("editor");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível abrir o arquivo recente.");
    } finally {
      setIsBusy(false);
    }
  };

  const saveDocument = async () => {
    if (!activeTab) return;
    const targetPath = activeTab.path ?? (await pickMarkdownSavePath());
    if (!targetPath) return;

    setIsBusy(true);
    setError(null);
    try {
      await saveMarkdownFile(targetPath, activeTab.markdown);
      const saved: DocumentTab = {
        ...activeTab,
        path: targetPath,
        name: getFileName(targetPath),
        savedMarkdown: activeTab.markdown,
        isDirty: false,
        lastSavedAt: new Date(),
      };
      replaceTab(saved);
      addRecentFile(targetPath);
      setView("editor");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o arquivo.");
    } finally {
      setIsBusy(false);
    }
  };

  const saveDocumentAs = async () => {
    if (!activeTab) return;
    const targetPath = await pickMarkdownSavePath(activeTab.path);
    if (!targetPath) return;

    setIsBusy(true);
    setError(null);
    try {
      await saveMarkdownFile(targetPath, activeTab.markdown);
      const saved: DocumentTab = {
        ...activeTab,
        path: targetPath,
        name: getFileName(targetPath),
        savedMarkdown: activeTab.markdown,
        isDirty: false,
        lastSavedAt: new Date(),
      };
      replaceTab(saved);
      addRecentFile(targetPath);
      setView("editor");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o arquivo.");
    } finally {
      setIsBusy(false);
    }
  };

  const exportDocumentPdf = async () => {
    if (!activeTab) return;

    try {
      setError(null);
      await exportMarkdownToPdf(activeTab.name, activeTab.markdown);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível exportar o PDF.");
    }
  };

  const closeDocument = async (id: string): Promise<boolean> => {
    const tab = tabs.find((t) => t.id === id);
    if (!tab) return false;
    if (!(await confirmDiscardTabs([tab]))) return false;
    closeTabById(id);
    return true;
  };

  const canCloseApp = () => confirmDiscardTabs(tabs);

  return (
    <FileActionsContext.Provider
      value={{
        initializeWorkspace,
        createDocument,
        openDocument,
        openDocumentFromPath,
        saveDocument,
        saveDocumentAs,
        exportDocumentPdf,
        closeDocument,
        canCloseApp,
      }}
    >
      {children}
    </FileActionsContext.Provider>
  );
}

export function useFileActions(): FileActionsContextValue {
  const ctx = useContext(FileActionsContext);
  if (!ctx) throw new Error("useFileActions must be used inside FileActionsProvider");
  return ctx;
}
