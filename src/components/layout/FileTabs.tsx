import { X } from "lucide-react";
import markdownFileIcon from "../../assets/file-markdown.png";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import { useTabsContext } from "../../contexts/TabsContext";
import { useFileActions } from "../../contexts/FileActionsContext";

export function FileTabs() {
  const { view } = useWorkspace();
  const { tabsMeta, activeTabId, switchTab } = useTabsContext();
  const { closeDocument } = useFileActions();

  if (tabsMeta.length === 0) return null;

  const isHome = view === "home";
  const activeTabIndex = tabsMeta.findIndex((t) => t.id === activeTabId);

  return (
    <div className="tabs-list" role="tablist" aria-label="Arquivos abertos">
      {tabsMeta.map((tab, index) => {
        const isActive = !isHome && tab.id === activeTabId;
        const shouldShowDivider =
          !isHome &&
          !isActive &&
          activeTabIndex >= 0 &&
          index > activeTabIndex &&
          index < tabsMeta.length - 1;

        return (
          <div
            aria-label={`${tab.name}${tab.isDirty ? " alterado" : ""}`}
            aria-selected={isActive}
            className={`file-tab ${isActive ? "is-active" : ""} ${
              tab.isDirty ? "is-dirty" : ""
            } ${shouldShowDivider ? "has-divider" : ""}`}
            key={tab.id}
            role="tab"
            tabIndex={0}
            title={tab.name}
            onClick={() => switchTab(tab.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                switchTab(tab.id);
              }
            }}
          >
            <img className="file-tab-icon" src={markdownFileIcon} alt="" aria-hidden="true" />
            <span className="file-tab-name">{tab.name}</span>
            <button
              className="file-tab-close"
              type="button"
              aria-label={`Fechar ${tab.name}`}
              onClick={(event) => {
                event.stopPropagation();
                void closeDocument(tab.id);
              }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
