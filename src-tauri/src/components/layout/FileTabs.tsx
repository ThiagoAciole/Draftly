import { X } from "lucide-react";
import type { DocumentTab } from "../../state/documentStore";

type FileTabsProps = {
  tabs: DocumentTab[];
  activeTabId: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
};

export function FileTabs({ tabs, activeTabId, onSelect, onClose }: FileTabsProps) {
  const activeTabIndex = tabs.findIndex((tab) => tab.id === activeTabId);

  return (
    <div className="tabs-list" role="tablist" aria-label="Arquivos abertos">
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeTabId;
        const shouldShowDivider =
          !isActive && activeTabIndex >= 0 && index > activeTabIndex && index < tabs.length - 1;

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
            onClick={() => onSelect(tab.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(tab.id);
              }
            }}
          >
            <span className="file-tab-name">{tab.name}</span>
            {tab.isDirty ? <span className="dirty-dot" aria-label="Nao salvo" /> : null}
            {isActive ? (
              <button
                className="file-tab-close"
                type="button"
                aria-label={`Fechar ${tab.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onClose(tab.id);
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
