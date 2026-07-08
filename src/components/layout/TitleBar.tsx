import { Plus } from "lucide-react";
import { FileMenu } from "./FileMenu";
import { FileTabs } from "./FileTabs";
import { WindowControls } from "./WindowControls";
import { useDocumentStore } from "../../state/documentStore";

export function TitleBar() {
  const goHome = useDocumentStore((state) => state.goHome);
  const createDocument = useDocumentStore((state) => state.createDocument);

  return (
    <header className="title-bar" data-tauri-drag-region>
      <div className="window-brand">
        <button className="app-home-button" type="button" aria-label="Home" title="Home" onClick={goHome}>
          <img className="app-mark" src="/src/assets/icon.svg" alt="" aria-hidden="true" />
        </button>
      </div>

      <div className="tab-strip" data-tauri-drag-region>
        <FileTabs />
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
      </div>

      <div className="title-actions">
        <FileMenu />
        <WindowControls />
      </div>
    </header>
  );
}
