import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreVertical } from "lucide-react";

type FileMenuProps = {
  onCreate: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
};

export function FileMenu({ onCreate, onOpen, onSave, onSaveAs }: FileMenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="titlebar-button" type="button" aria-label="Menu" title="Menu">
          <MoreVertical size={16} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="title-menu-content" align="end" sideOffset={8}>
          <DropdownMenu.Item className="title-menu-item" onSelect={onCreate}>
            Novo arquivo
          </DropdownMenu.Item>
          <DropdownMenu.Item className="title-menu-item" onSelect={onOpen}>
            Abrir Markdown
          </DropdownMenu.Item>
          <DropdownMenu.Item className="title-menu-item" onSelect={onSave}>
            Salvar
          </DropdownMenu.Item>
          <DropdownMenu.Item className="title-menu-item" onSelect={onSaveAs}>
            Salvar como
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
