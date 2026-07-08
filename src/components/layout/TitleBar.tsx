import { Plus } from "lucide-react";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import { useTabsContext } from "../../contexts/TabsContext";
import { useFileActions } from "../../contexts/FileActionsContext";
import { FileMenu } from "./FileMenu";
import { FileTabs } from "./FileTabs";
import { WindowControls } from "./WindowControls";

export function TitleBar() {
  const { setView } = useWorkspace();
  const { tabsMeta } = useTabsContext();
  const { createDocument } = useFileActions();

  const hasTabs = tabsMeta.length > 0;

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
          <img className="app-mark" src="/src/assets/icon.svg" alt="" aria-hidden="true" />
        </button>
      </div>

      <div className="tab-strip" data-tauri-drag-region>
        <FileTabs />
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
        <FileMenu />
        <WindowControls />
      </div>
    </header>
  );
}
