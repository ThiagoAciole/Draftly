import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { FilePlus, FileText, FolderOpen, MoreVertical, Save, SaveAll } from "lucide-react";
import { useDocumentStore, selectActiveTab } from "../../state/documentStore";
import { exportMarkdownToPdf } from "../../lib/fs";

export function FileMenu() {
  const createDocument = useDocumentStore((state) => state.createDocument);
  const openDocument = useDocumentStore((state) => state.openDocument);
  const saveDocument = useDocumentStore((state) => state.saveDocument);
  const saveDocumentAs = useDocumentStore((state) => state.saveDocumentAs);
  const activeTab = useDocumentStore(selectActiveTab);

  const handleExportPdf = () => {
    if (activeTab) {
      exportMarkdownToPdf(activeTab.name, activeTab.markdown);
    }
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
          <DropdownMenu.Item className="title-menu-item" onSelect={createDocument}>
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
            onSelect={handleExportPdf}
            disabled={!activeTab}
          >
            <span className="title-menu-label">
              <FileText size={15} />
              Exportar PDF
            </span>
            <span className="title-menu-shortcut">Ctrl+P</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
