import { Suspense, useEffect, useRef } from "react";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import { useTabsContext } from "../../contexts/TabsContext";
import { useFileActions } from "../../contexts/FileActionsContext";
import { useSettings } from "../../contexts/SettingsContext";
import { EditorLoading } from "../editor/EditorLoading";
import { MarkdownEditor, StatusBar } from "../editor/Editor.lazy";
import { Home } from "../home/Home";
import { SettingsModal } from "../settings/SettingsModal";
import { TitleBar } from "./TitleBar";
import "../../styles/settings.css";

export function AppShell() {
  const didInitialize = useRef(false);
  const { view, isBusy, error, clearError, openSettings } = useWorkspace();
  const { activeTab, recentFiles, updateActiveMarkdown } = useTabsContext();
  const {
    initializeWorkspace,
    createDocument,
    openDocument,
    openDocumentFromPath,
    saveDocument,
    exportDocumentPdf,
  } = useFileActions();
  const { settings } = useSettings();

  useEffect(() => {
    if (didInitialize.current) return;
    didInitialize.current = true;
    void initializeWorkspace();
  }, [initializeWorkspace]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "p") {
        event.preventDefault();
        void exportDocumentPdf();
      }
      if ((event.ctrlKey || event.metaKey) && event.key === ",") {
        event.preventDefault();
        openSettings();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [exportDocumentPdf, openSettings]);

  const showEditor = view === "editor" && activeTab != null;

  return (
    <div className="app-shell">
      <TitleBar />
      {error ? (
        <button className="error-banner" type="button" onClick={clearError}>
          {error}
        </button>
      ) : null}
      {showEditor ? (
        <Suspense fallback={<EditorLoading />}>
          <MarkdownEditor
            markdown={activeTab.markdown}
            onChange={updateActiveMarkdown}
            onSave={() => void saveDocument()}
          />
          <StatusBar />
        </Suspense>
      ) : (
        <Home
          recentFiles={recentFiles}
          isBusy={isBusy}
          onCreate={createDocument}
          onOpen={() => void openDocument()}
          onOpenRecent={(path) => void openDocumentFromPath(path)}
          showRecentFiles={settings.general.showRecentFiles}
        />
      )}
      <SettingsModal />
    </div>
  );
}
