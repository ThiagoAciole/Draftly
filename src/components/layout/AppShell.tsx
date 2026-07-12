import { Suspense, useEffect, useRef } from "react";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import { useTabsContext } from "../../contexts/TabsContext";
import { useFileActions } from "../../contexts/FileActionsContext";
import { useSettings } from "../../contexts/SettingsContext";
import { EditorLoading } from "../editor/EditorLoading";
import { MarkdownEditor, StatusBar } from "../editor/Editor.lazy";
import { SourceEditor } from "../editor/SourceEditor";
import { Home } from "../home/Home";
import { SearchBar } from "../search/SearchBar";
import { SettingsModal } from "../settings/SettingsModal";
import { TitleBar } from "./TitleBar";
import "../../styles/settings.css";
import "../../styles/search.css";

export function AppShell() {
  const didInitialize = useRef(false);
  const { view, isBusy, error, clearError, openSettings, isSearchOpen, openSearch, closeSearch, editorMode } = useWorkspace();
  const { activeTab, recentFiles, updateActiveMarkdown } = useTabsContext();
  const {
    initializeWorkspace,
    createDocument,
    openDocument,
    openDocumentFromPath,
    saveDocument,
    saveDocumentAs,
    exportDocumentPdf,
  } = useFileActions();
  const { settings } = useSettings();

  useEffect(() => {
    if (didInitialize.current) return;
    didInitialize.current = true;
    void initializeWorkspace();

    // Preload editor chunk so first file open doesn't flash loading
    import("../editor/MarkdownEditor").then((m) => { void m.MarkdownEditor; });
    import("../layout/StatusBar").then((m) => { void m.StatusBar; });
  }, [initializeWorkspace]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "p") {
        event.preventDefault();
        void exportDocumentPdf();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "n") {
        event.preventDefault();
        createDocument();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "o") {
        event.preventDefault();
        void openDocument();
      }
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveDocumentAs();
      }
      if ((event.ctrlKey || event.metaKey) && event.key === ",") {
        event.preventDefault();
        openSettings();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        if (view === "editor" && activeTab) {
          openSearch();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [createDocument, exportDocumentPdf, openDocument, openSearch, openSettings, saveDocumentAs, view, activeTab]);

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
          <div className="editor-section">
            {editorMode === "visual" ? (
              <MarkdownEditor
                markdown={activeTab.markdown}
                onChange={updateActiveMarkdown}
                onSave={() => void saveDocument()}
              />
            ) : (
              <SourceEditor markdown={activeTab.markdown} onChange={updateActiveMarkdown} />
            )}
            {editorMode === "visual" && isSearchOpen ? <SearchBar onClose={closeSearch} /> : <StatusBar />}
          </div>
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
