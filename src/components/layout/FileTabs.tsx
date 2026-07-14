import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown, X } from "lucide-react";
import { getFileIcon } from "../../lib/fileIcons";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import { useTabsContext } from "../../contexts/TabsContext";
import { useFileActions } from "../../contexts/FileActionsContext";

export function FileTabs() {
  const { view } = useWorkspace();
  const { tabsMeta, activeTabId, switchTab } = useTabsContext();
  const { closeDocument } = useFileActions();

  if (tabsMeta.length === 0) return null;

  const isHome = view === "home";
  const activeTabIndex = tabsMeta.findIndex((tab) => tab.id === activeTabId);
  const currentTab = tabsMeta[activeTabIndex >= 0 ? activeTabIndex : 0];

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
            className={`file-tab desktop-file-tab ${isActive ? "is-active" : ""} ${tab.id === currentTab.id ? "is-current" : ""} ${
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
            <img className="file-tab-icon" src={getFileIcon(tab.path ?? tab.name)} alt="" aria-hidden="true" />
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

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            className={`mobile-tab-picker file-tab ${!isHome ? "is-active" : ""} ${currentTab.isDirty ? "is-dirty" : ""}`}
            type="button"
            aria-label="Escolher arquivo aberto"
            title={currentTab.name}
          >
            <img className="file-tab-icon" src={getFileIcon(currentTab.path ?? currentTab.name)} alt="" aria-hidden="true" />
            <span className="file-tab-name">{currentTab.name}</span>
            <ChevronDown className="mobile-tab-picker-chevron" size={16} aria-hidden="true" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className="title-menu-content tab-picker-content" align="start" sideOffset={8}>
            {tabsMeta.map((tab) => {
              const isCurrent = tab.id === currentTab.id;
              return (
                <DropdownMenu.Item
                  className={`title-menu-item tab-picker-item ${isCurrent ? "is-current" : ""}`}
                  key={tab.id}
                  onSelect={() => switchTab(tab.id)}
                >
                  <span className="title-menu-label">
                    <img className="tab-picker-file-icon" src={getFileIcon(tab.path ?? tab.name)} alt="" aria-hidden="true" />
                    <span className={tab.isDirty ? "is-dirty" : ""}>{tab.name}</span>
                  </span>
                  {isCurrent ? <Check size={16} aria-label="Aba atual" /> : null}
                </DropdownMenu.Item>
              );
            })}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
