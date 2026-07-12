import { createContext, useContext, useEffect, useRef, useState } from "react";
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
import { getRestoredActiveTabId } from "../lib/documentUtils";
import { UnsavedChangesDialog } from "../components/dialogs/UnsavedChangesDialog";
import { VersionHistoryDialog } from "../components/dialogs/VersionHistoryDialog";
import { addVersionSnapshot, getVersionHistoryKey } from "../lib/versionHistory";
import type { VersionSnapshot } from "../lib/versionHistory";

type FileActionsContextValue = {
  initializeWorkspace: () => Promise<void>;
  createDocument: () => void;
  openDocument: () => Promise<void>;
  openDocumentFromPath: (path: string) => Promise<boolean>;
  saveDocument: () => Promise<void>;
  saveDocumentAs: () => Promise<void>;
  exportDocumentPdf: () => Promise<void>;
  openVersionHistory: () => Promise<void>;
  closeDocument: (id: string) => Promise<boolean>;
  canCloseApp: () => Promise<boolean>;
};

const SESSION_KEY = "last-session";

type SessionData = {
  paths: string[];
  activeTabPath: string | null;
};

const FileActionsContext = createContext<FileActionsContextValue | null>(null);

export function FileActionsProvider({ children }: { children: ReactNode }) {
  const { setView, setIsBusy, setError } = useWorkspace();
  const { tabs, activeTab, activeTabId, createBlankTab, addTab, addRecentFile, closeTabById, replaceTab, switchTab, updateActiveMarkdown } =
    useTabsContext();
  const { settings, store } = useSettings();
  const tabsRef = useRef(tabs);
  const closeDecisionResolver = useRef<((canClose: boolean) => void) | null>(null);
  const [pendingCloseTabs, setPendingCloseTabs] = useState<DocumentTab[] | null>(null);
  const [isSavingBeforeClose, setIsSavingBeforeClose] = useState(false);
  const [versionHistory, setVersionHistory] = useState<VersionSnapshot[] | null>(null);
  tabsRef.current = tabs;

  const resolveCloseDecision = (canClose: boolean) => {
    const resolve = closeDecisionResolver.current;
    closeDecisionResolver.current = null;
    setPendingCloseTabs(null);
    resolve?.(canClose);
  };

  const requestCloseDecision = (candidateTabs: DocumentTab[]): Promise<boolean> => {
    const dirtyTabs = candidateTabs.filter((tab) => tab.isDirty);
    if (dirtyTabs.length === 0) return Promise.resolve(true);
    if (closeDecisionResolver.current) return Promise.resolve(false);

    return new Promise((resolve) => {
      closeDecisionResolver.current = resolve;
      setPendingCloseTabs(dirtyTabs);
    });
  };

  const savePendingTabsAndClose = async () => {
    if (!pendingCloseTabs) return;

    setIsSavingBeforeClose(true);
    setIsBusy(true);
    setError(null);

    try {
      for (const pendingTab of pendingCloseTabs) {
        const tab = tabsRef.current.find((current) => current.id === pendingTab.id);
        if (!tab || !tab.isDirty) continue;

        const targetPath = tab.path ?? (await pickMarkdownSavePath());
        if (!targetPath) {
          resolveCloseDecision(false);
          return;
        }

        await saveVersionSnapshot(tab);
        await saveMarkdownFile(targetPath, tab.markdown);
        replaceTab({
          ...tab,
          path: targetPath,
          name: getFileName(targetPath),
          savedMarkdown: tab.markdown,
          isDirty: false,
          lastSavedAt: new Date(),
        });
        addRecentFile(targetPath);
      }
      resolveCloseDecision(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o arquivo.");
      resolveCloseDecision(false);
    } finally {
      setIsSavingBeforeClose(false);
      setIsBusy(false);
    }
  };

  const saveVersionSnapshot = async (tab: DocumentTab) => {
    if (!store || !tab.path || tab.savedMarkdown === tab.markdown) return;

    try {
      const key = getVersionHistoryKey(tab.path);
      const current = (await store.get<VersionSnapshot[]>(key)) ?? [];
      await store.set(key, addVersionSnapshot(current, tab.savedMarkdown));
      await store.save();
    } catch {
      // Version history must never prevent the user from saving their file.
    }
  };

  // Autosave: every 30s, save dirty tabs that have a path
  useEffect(() => {
    if (!settings.general.autosave) return;

    const autosave = async () => {
      const dirtyTabs = tabsRef.current.filter((t) => t.isDirty && t.path);
      for (const tab of dirtyTabs) {
        try {
          await saveVersionSnapshot(tab);
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
            const restoredTabs: DocumentTab[] = [];
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
                restoredTabs.push(tab);
                addRecentFile(file.path);
              } catch {
                // Skip files that no longer exist or can't be read
              }
            }
            const restoredActiveTabId = getRestoredActiveTabId(restoredTabs, session.activeTabPath);
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

  const openDocumentFromPath = async (path: string): Promise<boolean> => {
    setIsBusy(true);
    setError(null);
    try {
      const file = await readMarkdownFile(path);
      const existing = tabs.find((t) => t.path === file.path);
      if (existing) {
        addRecentFile(file.path);
        switchTab(existing.id);
        return true;
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
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível abrir o arquivo recente.");
      return false;
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
      await saveVersionSnapshot(activeTab);
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
      await saveVersionSnapshot(activeTab);
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

  const openVersionHistory = async () => {
    if (!activeTab?.path || !store) {
      setError("Salve o arquivo antes de acessar o histórico de versões.");
      return;
    }

    try {
      const snapshots = (await store.get<VersionSnapshot[]>(getVersionHistoryKey(activeTab.path))) ?? [];
      setVersionHistory(snapshots);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível abrir o histórico de versões.");
    }
  };

  const restoreVersion = (snapshot: VersionSnapshot) => {
    updateActiveMarkdown(snapshot.content);
    setVersionHistory(null);
  };

  const closeDocument = async (id: string): Promise<boolean> => {
    const tab = tabs.find((t) => t.id === id);
    if (!tab) return false;
    if (!(await requestCloseDecision([tab]))) return false;
    closeTabById(id);
    return true;
  };

  const canCloseApp = () => requestCloseDecision(tabs);

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
        openVersionHistory,
        closeDocument,
        canCloseApp,
      }}
    >
      {children}
      {pendingCloseTabs ? (
        <UnsavedChangesDialog
          tabs={pendingCloseTabs}
          isSaving={isSavingBeforeClose}
          onSave={() => void savePendingTabsAndClose()}
          onDiscard={() => resolveCloseDecision(true)}
          onCancel={() => resolveCloseDecision(false)}
        />
      ) : null}
      {versionHistory ? (
        <VersionHistoryDialog
          snapshots={versionHistory}
          onClose={() => setVersionHistory(null)}
          onRestore={restoreVersion}
        />
      ) : null}
    </FileActionsContext.Provider>
  );
}

export function useFileActions(): FileActionsContextValue {
  const ctx = useContext(FileActionsContext);
  if (!ctx) throw new Error("useFileActions must be used inside FileActionsProvider");
  return ctx;
}
