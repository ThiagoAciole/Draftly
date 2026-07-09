import { confirm } from "@tauri-apps/plugin-dialog";
import { createContext, useContext } from "react";
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

const FileActionsContext = createContext<FileActionsContextValue | null>(null);

export function FileActionsProvider({ children }: { children: ReactNode }) {
  const { setView, setIsBusy, setError } = useWorkspace();
  const { tabs, activeTab, createBlankTab, addTab, addRecentFile, closeTabById, replaceTab } =
    useTabsContext();

  const initializeWorkspace = async () => {
    setIsBusy(true);
    setError(null);
    try {
      const initialPath = await getInitialMarkdownFilePath();
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
        setView("editor");
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
        setView("editor");
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
