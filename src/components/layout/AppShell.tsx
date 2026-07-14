import { FileCode2, FilePlus, FileText, FolderOpen, History, Search, Settings, WandSparkles } from "lucide-react";
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
import { openSourceEditorSearch } from "../../lib/editorEvents";
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
    exportDocumentPdf, formatDocument,
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
        if (activeTab?.language === "markdown") {
          event.preventDefault();
          void exportDocumentPdf();
        }
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s" && !event.shiftKey) {
        event.preventDefault();
        void saveDocument();
      }
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "i") {
        event.preventDefault();
        void formatDocument();
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
        if (view === "editor" && activeTab?.editorKind === "visual-markdown" && editorMode === "visual") {
          openSearch();
        } else if (view === "editor" && activeTab) {
          openSourceEditorSearch();
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
  }, [closeCommandPalette, createDocument, exportDocumentPdf, formatDocument, isCommandPaletteOpen, openCommandPalette, openDocument, openSearch, openSettings, saveDocument, saveDocumentAs, view, activeTab, editorMode]);

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
              {activeTab.editorKind === "visual-markdown" && editorMode === "visual" ? (
                <MarkdownEditor
                  markdown={activeTab.markdown}
                  onChange={updateActiveMarkdown}
                  onSave={() => void saveDocument()}
                />
              ) : (
              <SourceEditor key={activeTab.id} content={activeTab.markdown} language={activeTab.language} showModeSwitch={activeTab.editorKind === "visual-markdown"} onChange={updateActiveMarkdown} />
              )}
              {activeTab.editorKind === "visual-markdown" ? <DocumentOutline markdown={activeTab.markdown} mode={editorMode} isOpen={isOutlineOpen} /> : null}
            </div>
            {activeTab.editorKind === "visual-markdown" && editorMode === "visual" && isSearchOpen ? <SearchBar onClose={closeSearch} /> : <StatusBar />}
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
            { id: "source", label: editorMode === "visual" ? "Alternar para Markdown fonte" : "Alternar para editor visual", icon: <FileCode2 size={16} />, disabled: !activeTab || activeTab.editorKind !== "visual-markdown", run: toggleEditorMode },
            { id: "format", label: "Formatar documento", shortcut: "Ctrl+Shift+I", icon: <WandSparkles size={16} />, disabled: !activeTab || activeTab.language === "markdown" || activeTab.language === "python", run: () => void formatDocument() },
            { id: "search", label: "Buscar no arquivo", shortcut: "Ctrl+F", icon: <Search size={16} />, disabled: !activeTab, run: () => activeTab?.editorKind === "visual-markdown" && editorMode === "visual" ? openSearch() : openSourceEditorSearch() },
            { id: "history", label: "Histórico de versões", icon: <History size={16} />, disabled: !activeTab?.path, run: () => void openVersionHistory() },
            { id: "export", label: "Exportar PDF", shortcut: "Ctrl+P", icon: <FileText size={16} />, disabled: !activeTab || activeTab.language !== "markdown", run: () => void exportDocumentPdf() },
            { id: "settings", label: "Configurações", shortcut: "Ctrl+,", icon: <Settings size={16} />, run: openSettings },
          ]}
        />
      ) : null}
    </div>
  );
}
