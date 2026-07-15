import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { FilePlus, FileText, FolderOpen, History, ListTree, MoreVertical, Save, SaveAll, Search, Settings, WandSparkles } from "lucide-react";
import { useTabsContext } from "../../contexts/TabsContext";
import { useFileActions } from "../../contexts/FileActionsContext";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import { openSourceEditorSearch } from "../../lib/editorEvents";

export function FileMenu() {
  const { activeTab } = useTabsContext();
  const { createDocument, openDocument, saveDocument, saveDocumentAs, exportDocumentPdf, openVersionHistory, formatDocument } =
    useFileActions();
  const { openSettings, view, editorMode, openSearch, isOutlineOpen, toggleOutline } = useWorkspace();
  const showEditorActions = view === "editor" && activeTab != null;
  const showSearch = showEditorActions && activeTab.editorKind !== "plain-text";
  const showOutline = showEditorActions && activeTab.editorKind === "visual-markdown";
  const isVisualMarkdown = showOutline && editorMode === "visual";
  const handleSearch = () => {
    if (isVisualMarkdown) openSearch();
    else openSourceEditorSearch();
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="titlebar-button" type="button" aria-label="Menu" title="Menu">
          <MoreVertical size={16} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="title-menu-content" align="end" sideOffset={8}>
          <DropdownMenu.Item className="title-menu-item" onSelect={() => createDocument()}>
            <span className="title-menu-label">
              <FilePlus size={15} />
              Novo arquivo
            </span>
            <span className="title-menu-shortcut">Ctrl+N</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item className="title-menu-item" onSelect={() => void openDocument()}>
            <span className="title-menu-label">
              <FolderOpen size={15} />
              Abrir
            </span>
            <span className="title-menu-shortcut">Ctrl+O</span>
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="title-menu-separator" />

          <DropdownMenu.Item className="title-menu-item" onSelect={() => void saveDocument()}>
            <span className="title-menu-label">
              <Save size={15} />
              Salvar
            </span>
            <span className="title-menu-shortcut">Ctrl+S</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item className="title-menu-item" onSelect={() => void saveDocumentAs()}>
            <span className="title-menu-label">
              <SaveAll size={15} />
              Salvar como
            </span>
            <span className="title-menu-shortcut">Ctrl+Shift+S</span>
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="title-menu-separator" />

          <DropdownMenu.Item
            className="title-menu-item"
            onSelect={() => void exportDocumentPdf()}
            disabled={!activeTab || activeTab.language !== "markdown"}
          >
            <span className="title-menu-label">
              <FileText size={15} />
              Exportar PDF
            </span>
            <span className="title-menu-shortcut">Ctrl+P</span>
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="title-menu-separator" />

          <DropdownMenu.Item
            className="title-menu-item"
            onSelect={() => void openVersionHistory()}
            disabled={!activeTab?.path}
          >
            <span className="title-menu-label">
              <History size={15} />
              Histórico de versões
            </span>
          </DropdownMenu.Item>

          <DropdownMenu.Item className="title-menu-item" onSelect={() => void formatDocument()} disabled={!activeTab || activeTab.editorKind !== "code" || activeTab.language === "python"}>
            <span className="title-menu-label"><WandSparkles size={15} />Formatar documento</span>
            <span className="title-menu-shortcut">Ctrl+Shift+I</span>
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="title-menu-separator" />

          <DropdownMenu.Item className="title-menu-item" onSelect={openSettings}>
            <span className="title-menu-label">
              <Settings size={15} />
              Configurações
            </span>
            <span className="title-menu-shortcut">Ctrl+,</span>
          </DropdownMenu.Item>

          {showSearch || showOutline ? <DropdownMenu.Separator className="title-menu-separator title-menu-compact-action" /> : null}

          {showSearch ? (
            <DropdownMenu.Item className="title-menu-item title-menu-compact-action" onSelect={handleSearch}>
              <span className="title-menu-label">
                <Search size={15} />
                Buscar no arquivo
              </span>
              <span className="title-menu-shortcut">Ctrl+F</span>
            </DropdownMenu.Item>
          ) : null}
          {showOutline ? (
            <DropdownMenu.Item className="title-menu-item title-menu-compact-action" onSelect={toggleOutline}>
              <span className="title-menu-label">
                <ListTree size={15} />
                {isOutlineOpen ? "Ocultar estrutura" : "Estrutura do documento"}
              </span>
            </DropdownMenu.Item>
          ) : null}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
