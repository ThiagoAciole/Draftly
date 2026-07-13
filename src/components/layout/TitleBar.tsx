import { ListTree, Plus, Search } from "lucide-react";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import { useTabsContext } from "../../contexts/TabsContext";
import { useFileActions } from "../../contexts/FileActionsContext";
import { useSettings } from "../../contexts/SettingsContext";
import { FileMenu } from "./FileMenu";
import { FileTabs } from "./FileTabs";
import { WindowControls } from "./WindowControls";
import appIcon from "../../assets/icon.svg";

export function TitleBar() {
  const { setView, view, openSearch, editorMode, isOutlineOpen, toggleOutline } = useWorkspace();
  const { tabsMeta, activeTab } = useTabsContext();
  const { createDocument } = useFileActions();
  const { settings } = useSettings();

  const hasTabs = tabsMeta.length > 0;
  const showTabs = settings.appearance.showTabs;
  const showEditorActions = view === "editor" && hasTabs;
  const showSearch = showEditorActions && activeTab?.editorKind === "visual-markdown" && editorMode === "visual";

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
          <button
            className="new-tab-button"
            type="button"
            aria-label="Novo arquivo"
            title="Novo arquivo"
            onClick={createDocument}
          >
            <span className="new-tab-button-icon">
              <Plus size={14} />
            </span>
          </button>
        ) : null}
      </div>

      <div className="title-actions">
        {showSearch ? (
          <button
            className="titlebar-button titlebar-compact-action"
            type="button"
            aria-label="Buscar no arquivo"
            title="Buscar (Ctrl+F)"
            onClick={openSearch}
          >
            <Search size={16} />
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
