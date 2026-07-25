import { Check, Clipboard, ListTree, Plus, Search, WandSparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import { useTabsContext } from "../../contexts/TabsContext";
import { useFileActions } from "../../contexts/FileActionsContext";
import { useSettings } from "../../contexts/SettingsContext";
import { FileMenu } from "./FileMenu";
import { FileTabs } from "./FileTabs";
import { WindowControls } from "./WindowControls";
import appIcon from "../../assets/icon.svg";
import { openSourceEditorSearch } from "../../lib/editorEvents";
import { copyTextToClipboard, markdownToPlainText } from "../../lib/clipboard";
import { NewDocumentDropdown } from "../ui/NewDocumentDropdown";
import { MarkdownAiMenu } from "../ai/MarkdownAiMenu";

export function TitleBar() {
  const { setView, view, openSearch, editorMode, isOutlineOpen, toggleOutline } = useWorkspace();
  const { tabsMeta, activeTab, updateActiveMarkdown } = useTabsContext();
  const { createDocument, formatDocument } = useFileActions();
  const { settings } = useSettings();
  const [hasCopiedText, setHasCopiedText] = useState(false);
  const copiedTextTimeoutRef = useRef<number | null>(null);

  const hasTabs = tabsMeta.length > 0;
  const showTabs = settings.appearance.showTabs;
  const showEditorActions = view === "editor" && hasTabs;
  const isVisualMarkdown = activeTab?.editorKind === "visual-markdown" && editorMode === "visual";
  const showSearch = showEditorActions && activeTab != null && activeTab.editorKind !== "plain-text";
  const showFormat = showEditorActions && activeTab?.editorKind === "code" && activeTab.language !== "python";
  const showMarkdownFormatter = showEditorActions && activeTab?.language === "markdown";
  const showCopy = showEditorActions && activeTab?.editorKind === "visual-markdown";
  const handleSearch = () => {
    if (isVisualMarkdown) openSearch();
    else openSourceEditorSearch();
  };
  const handleCopy = async () => {
    if (!activeTab) return;

    await copyTextToClipboard(markdownToPlainText(activeTab.markdown));
    setHasCopiedText(true);

    if (copiedTextTimeoutRef.current !== null) {
      window.clearTimeout(copiedTextTimeoutRef.current);
    }
    copiedTextTimeoutRef.current = window.setTimeout(() => {
      setHasCopiedText(false);
      copiedTextTimeoutRef.current = null;
    }, 1600);
  };

  useEffect(() => () => {
    if (copiedTextTimeoutRef.current !== null) {
      window.clearTimeout(copiedTextTimeoutRef.current);
    }
  }, []);

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
        {showCopy ? (
          <button
            className="titlebar-button titlebar-compact-action"
            type="button"
            aria-label={hasCopiedText ? "Texto limpo copiado" : "Copiar texto limpo"}
            title={hasCopiedText ? "Texto limpo copiado" : "Copiar texto limpo"}
            onClick={() => void handleCopy()}
          >
            {hasCopiedText ? <Check size={16} /> : <Clipboard size={16} />}
          </button>
        ) : null}
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
        {showMarkdownFormatter && activeTab ? <MarkdownAiMenu content={activeTab.markdown} onApply={updateActiveMarkdown} onError={() => {}} /> : null}
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
