import { ListTree, Plus, Search, WandSparkles } from "lucide-react";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import { useTabsContext } from "../../contexts/TabsContext";
import { useFileActions } from "../../contexts/FileActionsContext";
import { useSettings } from "../../contexts/SettingsContext";
import { FileMenu } from "./FileMenu";
import { FileTabs } from "./FileTabs";
import { WindowControls } from "./WindowControls";
import appIcon from "../../assets/icon.svg";
import { openSourceEditorSearch } from "../../lib/editorEvents";
import { NewDocumentDropdown } from "../ui/NewDocumentDropdown";

export function TitleBar() {
  const { setView, view, openSearch, editorMode, isOutlineOpen, toggleOutline } = useWorkspace();
  const { tabsMeta, activeTab } = useTabsContext();
  const { createDocument, formatDocument } = useFileActions();
  const { settings } = useSettings();

  const hasTabs = tabsMeta.length > 0;
  const showTabs = settings.appearance.showTabs;
  const showEditorActions = view === "editor" && hasTabs;
  const isVisualMarkdown = activeTab?.editorKind === "visual-markdown" && editorMode === "visual";
  const showSearch = showEditorActions && activeTab != null && activeTab.editorKind !== "plain-text";
  const showFormat = showEditorActions && activeTab?.editorKind === "code" && activeTab.language !== "python";
  const handleSearch = () => {
    if (isVisualMarkdown) openSearch();
    else openSourceEditorSearch();
  };

  return (
    <header className="title-bar" data-tauri-drag-region>
      <div className="window-brand">
        <button
          className="app-home-button"
          type="button"
          aria-label="Home"
          title="Home"
          onClick={() => setView("home")}
        >
          <img className="app-mark" src={appIcon} alt="" aria-hidden="true" />
        </button>
      </div>

      <div className="tab-strip" data-tauri-drag-region>
        {showTabs ? <FileTabs /> : null}
        {hasTabs ? (
          <NewDocumentDropdown className="title-new-document-menu" onCreate={createDocument}>
            <button className="new-tab-button" type="button" aria-label="Novo arquivo" title="Novo arquivo" aria-haspopup="menu">
              <span className="new-tab-button-icon">
                <Plus size={14} />
              </span>
            </button>
          </NewDocumentDropdown>
        ) : null}
      </div>

      <div className="title-actions">
        {showSearch ? (
          <button
            className="titlebar-button titlebar-compact-action"
            type="button"
            aria-label="Buscar no arquivo"
            title="Buscar (Ctrl+F)"
            onClick={handleSearch}
          >
            <Search size={16} />
          </button>
        ) : null}
        {showFormat ? (
          <button
            className="titlebar-button titlebar-compact-action"
            type="button"
            aria-label="Formatar documento"
            title="Formatar documento (Ctrl+Shift+I)"
            onClick={() => void formatDocument()}
          >
            <WandSparkles size={16} />
          </button>
        ) : null}
        {showEditorActions && activeTab?.editorKind === "visual-markdown" ? (
          <button
            className={`titlebar-button titlebar-compact-action ${isOutlineOpen ? "is-active" : ""}`}
            type="button"
            aria-label="Alternar estrutura do documento"
            aria-pressed={isOutlineOpen}
            title="Estrutura do documento"
            onClick={toggleOutline}
          >
            <ListTree size={16} />
          </button>
        ) : null}
        <FileMenu />
        <WindowControls />
      </div>
    </header>
  );
}
