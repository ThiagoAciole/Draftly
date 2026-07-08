import { Plus } from "lucide-react";
import { useDocumentStore } from "../../state/documentStore";
import { FileMenu } from "./FileMenu";
import { FileTabs } from "./FileTabs";
import { WindowControls } from "./WindowControls";

export function TitleBar() {
  const tabs = useDocumentStore((state) => state.tabs);
  const activeTabId = useDocumentStore((state) => state.activeTabId);
  const view = useDocumentStore((state) => state.view);
  const goHome = useDocumentStore((state) => state.goHome);
  const createDocument = useDocumentStore((state) => state.createDocument);
  const openDocument = useDocumentStore((state) => state.openDocument);
  const saveDocument = useDocumentStore((state) => state.saveDocument);
  const saveDocumentAs = useDocumentStore((state) => state.saveDocumentAs);
  const switchDocument = useDocumentStore((state) => state.switchDocument);
  const closeDocument = useDocumentStore((state) => state.closeDocument);
  const canCloseApp = useDocumentStore((state) => state.canCloseApp);
  const hasOpenTabs = tabs.length > 0;

  return (
    <header className="title-bar" data-tauri-drag-region>
      <div className="window-brand">
        <button className="app-home-button" type="button" aria-label="Home" title="Home" onClick={goHome}>
          <img className="app-mark" src="/src/assets/icon.svg" alt="" aria-hidden="true" />
        </button>
      </div>

      <div className={`tab-strip ${hasOpenTabs ? "" : "is-home"}`}>
        {hasOpenTabs ? (
          <>
            <FileTabs
              tabs={tabs}
              activeTabId={view === "editor" ? activeTabId : null}
              onSelect={switchDocument}
              onClose={(id) => void closeDocument(id)}
            />
            <button
              className="new-tab-button"
              type="button"
              aria-label="Novo arquivo"
              title="Novo arquivo"
              onClick={createDocument}
            >
              <Plus size={15} />
            </button>
            <div className="title-drag-zone" data-tauri-drag-region />
          </>
        ) : (
          <div className="title-drag-zone" data-tauri-drag-region />
        )}
      </div>

      <div className="title-actions">
        <FileMenu
          onCreate={createDocument}
          onOpen={() => void openDocument()}
          onSave={() => void saveDocument()}
          onSaveAs={() => void saveDocumentAs()}
        />
        <WindowControls canCloseApp={canCloseApp} />
      </div>
    </header>
  );
}
