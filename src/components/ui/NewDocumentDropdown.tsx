import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { FileCode2, FileText, FileType } from "lucide-react";
import type { ReactNode } from "react";
import type { DocumentLanguage } from "../../lib/languages";

type NewDocumentDropdownProps = {
  children: ReactNode;
  className?: string;
  onCreate: (language: DocumentLanguage) => void;
  sideOffset?: number;
};

const documentTypes: Array<{ language: DocumentLanguage; label: string; icon: typeof FileText }> = [
  { language: "markdown", label: "Markdown", icon: FileText },
  { language: "json", label: "JSON", icon: FileCode2 },
  { language: "plaintext", label: "Texto", icon: FileType },
];

export function NewDocumentDropdown({ children, className, onCreate, sideOffset = 8 }: NewDocumentDropdownProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{children}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className={`new-document-menu ${className ?? ""}`} align="end" sideOffset={sideOffset}>
          {documentTypes.map(({ language, label, icon: Icon }) => (
            <DropdownMenu.Item className="new-document-menu-item" key={language} onSelect={() => onCreate(language)}>
              <Icon size={15} aria-hidden="true" />
              {label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
