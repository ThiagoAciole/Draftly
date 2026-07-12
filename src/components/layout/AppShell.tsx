import { FileCode2, FilePlus, FileText, FolderOpen, History, Search, Settings } from "lucide-react";
import { Suspense, useEffect, useRef } from "react";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import { useTabsContext } from "../../contexts/TabsContext";
import { useFileActions } from "../../contexts/FileActionsContext";
import { useSettings } from "../../contexts/SettingsContext";
import { EditorLoading } from "../editor/EditorLoading";
import { MarkdownEditor, StatusBar } from "../editor/Editor.lazy";
import { SourceEditor } from "../editor/SourceEditor";
import { DocumentOutline } from "../editor/DocumentOutline";
import { CommandPalette } from "../commands/CommandPalette";
import { Home } from "../home/Home";
import { SearchBar } from "../search/SearchBar";
import { SettingsModal } from "../settings/SettingsModal";
import { TitleBar } from "./TitleBar";
import "../../styles/settings.css";
import "../../styles/search.css";

export function AppShell() {
  const didInitialize = useRef(false);
  const { view, isBusy, error, clearError, openSettings, isSearchOpen, openSearch, closeSearch, editorMode, toggleEditorMode, isCommandPaletteOpen, openCommandPalette, closeCommandPalette, isOutlineOpen } = useWorkspace();
  const { activeTab, recentFiles, updateActiveMarkdown, removeRecentFile, clearRecentFiles } = useTabsContext();
  const {
    initializeWorkspace,
    createDocument,
    openDocument,
    openDocumentFromPath,
    saveDocument,
    saveDocumentAs,
    exportDocumentPdf,
    openVersionHistory,
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
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (isCommandPaletteOpen) closeCommandPalette();
        else openCommandPalette();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeCommandPalette, createDocument, exportDocumentPdf, isCommandPaletteOpen, openCommandPalette, openDocument, openSearch, openSettings, saveDocumentAs, view, activeTab]);

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
            <div className="editor-content">
              {editorMode === "visual" ? (
                <MarkdownEditor
                  markdown={activeTab.markdown}
                  onChange={updateActiveMarkdown}
                  onSave={() => void saveDocument()}
                />
              ) : (
              <SourceEditor markdown={activeTab.markdown} onChange={updateActiveMarkdown} onExit={toggleEditorMode} />
              )}
              <DocumentOutline markdown={activeTab.markdown} mode={editorMode} isOpen={isOutlineOpen} />
            </div>
            {editorMode === "visual" && isSearchOpen ? <SearchBar onClose={closeSearch} /> : <StatusBar />}
          </div>
        </Suspense>
      ) : (
        <Home
          recentFiles={recentFiles}
          isBusy={isBusy}
          onCreate={createDocument}
          onOpen={() => void openDocument()}
          onOpenRecent={openDocumentFromPath}
          onRemoveRecent={removeRecentFile}
          onClearRecent={clearRecentFiles}
          showRecentFiles={settings.general.showRecentFiles}
        />
      )}
      <SettingsModal />
      {isCommandPaletteOpen ? (
        <CommandPalette
          onClose={closeCommandPalette}
          actions={[
            { id: "new", label: "Novo arquivo", shortcut: "Ctrl+N", icon: <FilePlus size={16} />, run: createDocument },
            { id: "open", label: "Abrir arquivo", shortcut: "Ctrl+O", icon: <FolderOpen size={16} />, run: () => void openDocument() },
            { id: "save", label: "Salvar", shortcut: "Ctrl+S", icon: <FileText size={16} />, disabled: !activeTab, run: () => void saveDocument() },
            { id: "source", label: editorMode === "visual" ? "Alternar para Markdown fonte" : "Alternar para editor visual", icon: <FileCode2 size={16} />, disabled: !activeTab, run: toggleEditorMode },
            { id: "search", label: "Buscar no arquivo", shortcut: "Ctrl+F", icon: <Search size={16} />, disabled: !activeTab || editorMode !== "visual", run: openSearch },
            { id: "history", label: "Histórico de versões", icon: <History size={16} />, disabled: !activeTab?.path, run: () => void openVersionHistory() },
            { id: "export", label: "Exportar PDF", shortcut: "Ctrl+P", icon: <FileText size={16} />, disabled: !activeTab, run: () => void exportDocumentPdf() },
            { id: "settings", label: "Configurações", shortcut: "Ctrl+,", icon: <Settings size={16} />, run: openSettings },
          ]}
        />
      ) : null}
    </div>
  );
}
