import { X } from "lucide-react";
import { useTabsContext } from "../../contexts/TabsContext";
import { useFileActions } from "../../contexts/FileActionsContext";

export function FileTabs() {
  const { tabsMeta, activeTabId, switchTab } = useTabsContext();
  const { closeDocument } = useFileActions();

  if (tabsMeta.length === 0) return null;

  const activeTabIndex = tabsMeta.findIndex((t) => t.id === activeTabId);

  return (
    <div className="tabs-list" role="tablist" aria-label="Arquivos abertos">
      {tabsMeta.map((tab, index) => {
        const isActive = tab.id === activeTabId;
        const shouldShowDivider =
          !isActive &&
          activeTabIndex >= 0 &&
          index > activeTabIndex &&
          index < tabsMeta.length - 1;

        return (
          <div
            aria-selected={isActive}
            className={`file-tab ${isActive ? "is-active" : ""} ${
              shouldShowDivider ? "has-divider" : ""
            }`}
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
            <span className="file-tab-name">{tab.name}</span>
            {tab.isDirty ? <span className="dirty-dot" aria-label="Não salvo" /> : null}
            {isActive ? (
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
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
