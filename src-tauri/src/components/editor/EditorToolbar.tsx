import type { BlockNoteEditor } from "@blocknote/core";
import {
  useEditorChange,
  useEditorSelectionChange,
  useSelectedBlocks,
} from "@blocknote/react";
import {
  Bold,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link,
  Pencil,
  Save,
  Strikethrough,
} from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useState } from "react";
import { IconButton } from "../ui/IconButton";

type EditorToolbarProps = {
  editor: BlockNoteEditor;
  onSave: () => void;
};

type FormatButtonProps = {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
};

function FormatButton({ label, active, disabled, onClick, children }: FormatButtonProps) {
  return (
    <button
      aria-label={label}
      className={`format-button ${active ? "is-active" : ""}`}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

export function EditorToolbar({ editor, onSave }: EditorToolbarProps) {
  const [, setRevision] = useState(0);
  const selectedBlocks = useSelectedBlocks(editor);
  const refresh = useCallback(() => setRevision((revision) => revision + 1), []);

  useEditorChange(refresh, editor);
  useEditorSelectionChange(refresh, editor);

  const activeStyles = editor.getActiveStyles();
  const activeBlock = selectedBlocks[0];
  const activeHeadingLevel =
    activeBlock?.type === "heading" ? Number(activeBlock.props.level) : null;

  const toggleStyle = (style: "bold" | "italic" | "underline" | "strike" | "code") => {
    editor.focus();
    editor.toggleStyles({ [style]: true });
    refresh();
  };

  const setHeading = (level: 1 | 2 | 3) => {
    editor.focus();

    for (const block of selectedBlocks) {
      if (activeHeadingLevel === level) {
        editor.updateBlock(block, { type: "paragraph" });
      } else {
        editor.updateBlock(block, { type: "heading", props: { level } });
      }
    }

    refresh();
  };

  const createLink = () => {
    editor.focus();

    const selectedText = editor.getSelectedText();
    const previousUrl = editor.getSelectedLinkUrl();
    const url = window.prompt("URL do link", previousUrl || "https://");

    if (url === null) return;

    if (url.trim() !== "") {
      editor.createLink(url.trim(), selectedText || undefined);
      refresh();
    }
  };

  return (
    <div className="editor-toolbar" role="toolbar" aria-label="Editor">
      <div className="editor-formatting-toolbar">
        <FormatButton
          active={Boolean(activeStyles.bold)}
          label="Negrito"
          onClick={() => toggleStyle("bold")}
        >
          <Bold size={17} />
        </FormatButton>
        <FormatButton
          active={Boolean(activeStyles.italic)}
          label="Italico"
          onClick={() => toggleStyle("italic")}
        >
          <Italic size={17} />
        </FormatButton>
        <FormatButton
          active={Boolean(activeStyles.strike)}
          label="Tachado"
          onClick={() => toggleStyle("strike")}
        >
          <Strikethrough size={17} />
        </FormatButton>
        <span className="format-separator" />
        <FormatButton
          active={activeHeadingLevel === 1}
          label="Titulo 1"
          onClick={() => setHeading(1)}
        >
          <Heading1 size={18} />
        </FormatButton>
        <FormatButton
          active={activeHeadingLevel === 2}
          label="Titulo 2"
          onClick={() => setHeading(2)}
        >
          <Heading2 size={18} />
        </FormatButton>
        <FormatButton
          active={activeHeadingLevel === 3}
          label="Titulo 3"
          onClick={() => setHeading(3)}
        >
          <Heading3 size={18} />
        </FormatButton>
        <span className="format-separator" />
        <FormatButton
          active={Boolean(activeStyles.underline)}
          label="Sublinhado"
          onClick={() => toggleStyle("underline")}
        >
          <Pencil size={16} />
        </FormatButton>
        <FormatButton
          active={Boolean(activeStyles.code)}
          label="Codigo"
          onClick={() => toggleStyle("code")}
        >
          <Code2 size={17} />
        </FormatButton>
        <FormatButton label="Link" onClick={createLink}>
          <Link size={17} />
        </FormatButton>
      </div>
      <span className="toolbar-spacer" />
      <IconButton label="Salvar" onClick={onSave}>
        <Save size={17} />
      </IconButton>
    </div>
  );
}
