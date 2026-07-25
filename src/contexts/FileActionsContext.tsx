import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  getFileName,
  getInitialTextFilePath,
  openTextFile,
  pickTextSavePath,
  readTextFile,
  saveTextFile,
  exportMarkdownToPdf,
} from "../lib/fs";
import type { TextFile } from "../lib/fs";
import { formatDocumentContent } from "../lib/formatDocument";
import { getLanguageForPath } from "../lib/languages";
import { useTabsContext } from "./TabsContext";
import type { DocumentTab } from "./TabsContext";
import { useWorkspace } from "./WorkspaceContext";
import { useSettings } from "./SettingsContext";
import { getRestoredActiveTabId } from "../lib/documentUtils";
import { UnsavedChangesDialog } from "../components/dialogs/UnsavedChangesDialog";
import { VersionHistoryDialog } from "../components/dialogs/VersionHistoryDialog";
import { ExternalChangesDialog } from "../components/dialogs/ExternalChangesDialog";
import { addVersionSnapshot, getVersionHistoryKey } from "../lib/versionHistory";
import type { VersionSnapshot } from "../lib/versionHistory";
import type { DocumentLanguage } from "../lib/languages";
import { getRecoverableDrafts } from "../lib/recoveryDrafts";
import type { RecoverableDraft } from "../lib/recoveryDrafts";
import { retryOnce } from "../lib/retry";
import { formatPlainTextAsMarkdown } from "../lib/smartMarkdown";
import { getTemporaryMarkdownName, isTextImportPath } from "../lib/txtImport";

type FileActionsContextValue = {
  initializeWorkspace: () => Promise<void>;
  createDocument: (language?: DocumentLanguage) => void;
  openDocument: () => Promise<void>;
  openDocumentFromPath: (path: string) => Promise<boolean>;
  saveDocument: () => Promise<void>;
  saveDocumentAs: () => Promise<void>;
  exportDocumentPdf: () => Promise<void>;
  formatDocument: () => Promise<boolean>;
  formatMarkdownDocument: () => boolean;
  openVersionHistory: () => Promise<void>;
  closeDocument: (id: string) => Promise<boolean>;
  canCloseApp: () => Promise<boolean>;
};

const SESSION_KEY = "last-session";
const RECOVERY_KEY = "recovery-drafts";

type SessionData = {
  paths: string[];
  activeTabPath: string | null;
};

type ExternalChange = {
  tabId: string;
  fileName: string;
  path: string;
  localContent: string;
  diskContent: string;
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
  const [externalChange, setExternalChange] = useState<ExternalChange | null>(null);
  const ignoredExternalChanges = useRef(new Map<string, string>());
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

        const targetPath = tab.path ?? (await pickTextSavePath(tab.name));
        if (!targetPath) {
          resolveCloseDecision(false);
          return;
        }

        await saveVersionSnapshot(tab);
        const content = await getFormattedContentForPath(tab, targetPath);
        await saveTextFile(targetPath, content);
        replaceTab({
          ...tab,
          path: targetPath,
          name: getFileName(targetPath),
          language: getLanguageForPath(targetPath).id,
          editorKind: getLanguageForPath(targetPath).editorKind,
          markdown: content,
          savedMarkdown: content,
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

  const getFormattedContentForPath = (tab: DocumentTab, path: string) =>
    settings.codeEditor.formatOnSave
      ? formatDocumentContent(tab.markdown, getLanguageForPath(path).id)
      : Promise.resolve(tab.markdown);

  const createTabFromFile = (file: TextFile): DocumentTab => {
    if (isTextImportPath(file.path)) {
      return {
        ...createBlankTab("markdown"),
        name: getTemporaryMarkdownName(file.name),
        markdown: file.content,
        savedMarkdown: "",
        isDirty: file.content.length > 0,
      };
    }

    return {
      ...createBlankTab(),
      path: file.path,
      name: file.name,
      language: file.language,
      editorKind: getLanguageForPath(file.path).editorKind,
      markdown: file.content,
      savedMarkdown: file.content,
    };
  };

  useEffect(() => {
    if (!store) return;

    const timeout = window.setTimeout(() => {
      const drafts = getRecoverableDrafts(tabsRef.current);
      void (async () => {
        try {
          if (drafts.length === 0) await store.delete(RECOVERY_KEY);
          else await store.set(RECOVERY_KEY, drafts);
          await store.save();
        } catch {
          // A versão em memória continua disponível mesmo se o armazenamento local falhar.
        }
      })();
    }, 1_000);

    return () => window.clearTimeout(timeout);
  }, [store, tabs]);

  // Autosave: every 30s, save dirty tabs that have a path
  useEffect(() => {
    if (!settings.general.autosave) return;

    const autosave = async () => {
      const dirtyTabs = tabsRef.current.filter((t) => t.isDirty && t.path);
      for (const tab of dirtyTabs) {
        try {
          await saveVersionSnapshot(tab);
          const content = await getFormattedContentForPath(tab, tab.path!);
          await retryOnce(() => saveTextFile(tab.path!, content));
          replaceTab({
            ...tab,
            markdown: content,
            savedMarkdown: content,
            isDirty: false,
            lastSavedAt: new Date(),
          });
        } catch {
          setError("O salvamento automático falhou após duas tentativas. Suas alterações continuam abertas; use Ctrl+S para tentar novamente.");
          // Silently skip — autosave failures shouldn't disrupt the user
        }
      }
    };

    const id = window.setInterval(autosave, 30_000);
    return () => window.clearInterval(id);
  }, [settings.general.autosave, replaceTab]);

  useEffect(() => {
    if (externalChange) return;

    const checkExternalChanges = async () => {
      for (const tab of tabsRef.current) {
        if (!tab.path) continue;

        try {
          const file = await readTextFile(tab.path);
          if (file.content === tab.savedMarkdown || ignoredExternalChanges.current.get(tab.path) === file.content) continue;
          setExternalChange({ tabId: tab.id, fileName: tab.name, path: tab.path, localContent: tab.markdown, diskContent: file.content });
          return;
        } catch {
          // Arquivos removidos ou indisponíveis continuam com o conteúdo aberto na aba.
        }
      }
    };

    const interval = window.setInterval(() => void checkExternalChanges(), 15_000);
    const onFocus = () => void checkExternalChanges();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [externalChange]);

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
      const initialPath = await getInitialTextFilePath();

      if (!initialPath && store) {
        const drafts = (await store.get<RecoverableDraft[]>(RECOVERY_KEY)) ?? [];
        if (drafts.length > 0) {
          for (const draft of drafts) {
            let savedMarkdown = draft.savedMarkdown;
            let path = draft.path;
            let name = draft.name;
            let language = getLanguageForPath(draft.path ?? draft.name).id;
            let editorKind = getLanguageForPath(draft.path ?? draft.name).editorKind;

            if (draft.path) {
              try {
                const file = await readTextFile(draft.path);
                savedMarkdown = file.content;
                path = file.path;
                name = file.name;
                language = file.language;
                editorKind = getLanguageForPath(file.path).editorKind;
              } catch {
                path = null;
              }
            }

            addTab({
              ...createBlankTab(language),
              path,
              name,
              language,
              editorKind,
              markdown: draft.markdown,
              savedMarkdown,
              isDirty: draft.markdown !== savedMarkdown,
            });
          }
          await store.delete(RECOVERY_KEY);
          await store.save();
          setError("Rascunhos não salvos foram recuperados.");
          setView("editor");
          return;
        }
      }

      // Session restore takes precedence over CLI args
      if (settings.general.restoreSession && !initialPath && store) {
        try {
          const session = await store.get<SessionData>(SESSION_KEY);
          if (session?.paths?.length) {
            const restoredTabs: DocumentTab[] = [];
            for (const path of session.paths) {
              try {
                const file = await readTextFile(path);
                const tab = createTabFromFile(file);
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
      const file = await readTextFile(initialPath);
      const tab = createTabFromFile(file);
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

  const createDocument = (language?: DocumentLanguage) => {
    const tab = createBlankTab(language);
    addTab(tab);
    setView("editor");
    setError(null);
  };

  const openDocument = async () => {
    setIsBusy(true);
    setError(null);
    try {
      const file = await openTextFile();
      if (!file) return;

      const existing = tabs.find((t) => t.path === file.path);
      if (existing) {
        addRecentFile(file.path);
        switchTab(existing.id);
        return;
      }

      const tab = createTabFromFile(file);
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
      const file = await readTextFile(path);
      const existing = tabs.find((t) => t.path === file.path);
      if (existing) {
        addRecentFile(file.path);
        switchTab(existing.id);
        return true;
      }
      const tab = createTabFromFile(file);
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
    const targetPath = activeTab.path ?? (await pickTextSavePath(activeTab.name));
    if (!targetPath) return;

    setIsBusy(true);
    setError(null);
    try {
      await saveVersionSnapshot(activeTab);
      const content = await getFormattedContentForPath(activeTab, targetPath);
      await saveTextFile(targetPath, content);
      const saved: DocumentTab = {
        ...activeTab,
        path: targetPath,
        name: getFileName(targetPath),
        language: getLanguageForPath(targetPath).id,
        editorKind: getLanguageForPath(targetPath).editorKind,
        markdown: content,
        savedMarkdown: content,
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
    const targetPath = await pickTextSavePath(activeTab.path ?? activeTab.name);
    if (!targetPath) return;

    setIsBusy(true);
    setError(null);
    try {
      await saveVersionSnapshot(activeTab);
      const content = await getFormattedContentForPath(activeTab, targetPath);
      await saveTextFile(targetPath, content);
      const saved: DocumentTab = {
        ...activeTab,
        path: targetPath,
        name: getFileName(targetPath),
        language: getLanguageForPath(targetPath).id,
        editorKind: getLanguageForPath(targetPath).editorKind,
        markdown: content,
        savedMarkdown: content,
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
    if (!activeTab || activeTab.language !== "markdown") return;

    try {
      setError(null);
      await exportMarkdownToPdf(activeTab.name, activeTab.markdown);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível exportar o PDF.");
    }
  };

  const formatDocument = async (): Promise<boolean> => {
    if (!activeTab) return false;
    try {
      setError(null);
      const content = await formatDocumentContent(activeTab.markdown, activeTab.language);
      if (content !== activeTab.markdown) updateActiveMarkdown(content);
      return true;
    } catch (err) {
      setError(err instanceof Error ? `NÃ£o foi possÃ­vel formatar o arquivo: ${err.message}` : "NÃ£o foi possÃ­vel formatar o arquivo.");
      return false;
    }
  };

  const formatMarkdownDocument = (): boolean => {
    if (!activeTab || activeTab.language !== "markdown") return false;
    const content = formatPlainTextAsMarkdown(activeTab.markdown);
    if (content === activeTab.markdown) return false;
    updateActiveMarkdown(content);
    return true;
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

  const keepExternalChange = () => {
    if (!externalChange) return;
    const tab = tabsRef.current.find((current) => current.id === externalChange.tabId);
    if (tab) {
      replaceTab({
        ...tab,
        savedMarkdown: externalChange.diskContent,
        isDirty: tab.markdown !== externalChange.diskContent,
      });
    }
    ignoredExternalChanges.current.set(externalChange.path, externalChange.diskContent);
    setExternalChange(null);
  };

  const reloadExternalChange = () => {
    if (!externalChange) return;
    const tab = tabsRef.current.find((current) => current.id === externalChange.tabId);
    if (tab) {
      replaceTab({
        ...tab,
        markdown: externalChange.diskContent,
        savedMarkdown: externalChange.diskContent,
        isDirty: false,
        lastSavedAt: new Date(),
      });
    }
    ignoredExternalChanges.current.delete(externalChange.path);
    setExternalChange(null);
  };

  const closeDocument = async (id: string): Promise<boolean> => {
    const tab = tabs.find((t) => t.id === id);
    if (!tab) return false;
    if (!(await requestCloseDecision([tab]))) return false;
    closeTabById(id);
    return true;
  };

  const canCloseApp = async () => {
    const canClose = await requestCloseDecision(tabs);
    if (canClose && store) {
      try {
        await store.delete(RECOVERY_KEY);
        await store.save();
      } catch {
        // O fechamento não deve ser bloqueado se a limpeza local falhar.
      }
    }
    return canClose;
  };

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
        formatDocument,
        formatMarkdownDocument,
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
      {externalChange ? (
        <ExternalChangesDialog
          fileName={externalChange.fileName}
          localContent={externalChange.localContent}
          diskContent={externalChange.diskContent}
          onKeep={keepExternalChange}
          onReload={reloadExternalChange}
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
