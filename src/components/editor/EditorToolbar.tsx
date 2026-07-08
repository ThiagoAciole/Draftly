import type { BlockNoteEditor } from "@blocknote/core";
import {
  getDefaultReactSlashMenuItems,
  useEditorChange,
  useEditorSelectionChange,
  useSelectedBlocks,
} from "@blocknote/react";
import {
  Bold,
  ChevronRight,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Image,
  Italic,
  Link,
  List,
  ListChecks,
  ListOrdered,
  Pencil,
  Quote,
  Strikethrough,
  Table,
  UploadCloud,
} from "lucide-react";
import type { KeyboardEvent, ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

type EditorToolbarProps = {
  editor: BlockNoteEditor;
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

type LinkModalProps = {
  initialUrl: string;
  initialText: string;
  onConfirm: (url: string, text: string) => void;
  onClose: () => void;
};

function LinkModal({ initialUrl, initialText, onConfirm, onClose }: LinkModalProps) {
  const [url, setUrl] = useState(initialUrl);
  const [text, setText] = useState(initialText);
  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    urlInputRef.current?.focus();
    urlInputRef.current?.select();
  }, []);

  useEffect(() => {
    const handleKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleConfirm = () => {
    if (url.trim()) onConfirm(url.trim(), text.trim());
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") handleConfirm();
  };

  return (
    <div className="link-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="link-modal" role="dialog" aria-modal="true" aria-label="Inserir link">
        <div className="link-modal-header">
          <span className="link-modal-title">Inserir link</span>
          <button className="link-modal-close" type="button" aria-label="Fechar" onClick={onClose}>✕</button>
        </div>
        <div className="link-modal-body">
          <label className="link-modal-label">
            URL <span className="link-modal-required">*</span>
          </label>
          <input
            ref={urlInputRef}
            className="link-modal-input"
            type="url"
            placeholder="Cole ou digite uma URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <label className="link-modal-label" style={{ marginTop: 14 }}>
            Texto exibido <span className="link-modal-optional">(opcional)</span>
          </label>
          <input
            className="link-modal-input"
            type="text"
            placeholder="Texto do link"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <button
          className="link-modal-confirm"
          type="button"
          disabled={!url.trim()}
          onClick={handleConfirm}
        >
          Confirmar
        </button>
      </div>
    </div>
  );
}

type ImageModalProps = {
  onConfirm: (url: string) => void;
  onClose: () => void;
};

function ImageModal({ onConfirm, onClose }: ImageModalProps) {
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    onConfirm(url);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="link-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="link-modal" role="dialog" aria-modal="true" aria-label="Inserir imagem">
        <div className="link-modal-header">
          <span className="link-modal-title">Insira a Imagem</span>
          <button className="link-modal-close" type="button" aria-label="Fechar" onClick={onClose}>✕</button>
        </div>
        <div className="link-modal-body">
          <div
            className={`image-dropzone ${dragging ? "is-dragging" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileInput} />
            <div className="image-dropzone-icon">
              <UploadCloud size={28} />
            </div>
            <p className="image-dropzone-title">Arraste e solte ou clique para selecionar</p>
            <p className="image-dropzone-hint">PNG, JPG, GIF, WebP</p>
            <button
              className="image-dropzone-browse"
              type="button"
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
            >
              Escolher arquivo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const TEXT_COLORS = [
  { label: "Padrão", value: "default", hex: null },
  { label: "Cinza", value: "gray", hex: "#9b9b9b" },
  { label: "Marrom", value: "brown", hex: "#b45309" },
  { label: "Vermelho", value: "red", hex: "#ef4444" },
  { label: "Laranja", value: "orange", hex: "#f97316" },
  { label: "Amarelo", value: "yellow", hex: "#eab308" },
  { label: "Verde", value: "green", hex: "#22c55e" },
  { label: "Azul", value: "blue", hex: "#3b82f6" },
  { label: "Roxo", value: "purple", hex: "#a855f7" },
  { label: "Rosa", value: "pink", hex: "#ec4899" },
];

const BG_COLORS = [
  { label: "Padrão", value: "default", hex: null },
  { label: "Cinza", value: "gray", hex: "#3f3f3f" },
  { label: "Marrom", value: "brown", hex: "#4a3728" },
  { label: "Vermelho", value: "red", hex: "#4a1e1e" },
  { label: "Laranja", value: "orange", hex: "#4a2e1a" },
  { label: "Amarelo", value: "yellow", hex: "#4a3e10" },
  { label: "Verde", value: "green", hex: "#1a3a24" },
  { label: "Azul", value: "blue", hex: "#1a2a4a" },
  { label: "Roxo", value: "purple", hex: "#2e1a4a" },
  { label: "Rosa", value: "pink", hex: "#4a1a3a" },
];

type ColorSwatchProps = {
  label: string;
  hex: string | null;
  active?: boolean;
  onClick: () => void;
  isText?: boolean;
};

function ColorSwatch({ label, hex, active, onClick, isText }: ColorSwatchProps) {
  return (
    <button
      aria-label={label}
      className={`color-swatch ${active ? "is-active" : ""}`}
      onClick={onClick}
      title={label}
      type="button"
      style={isText ? { color: hex ?? "inherit" } : { background: hex ?? "transparent" }}
    >
      {isText ? (
        <span className="color-swatch-text">A</span>
      ) : (
        hex === null && <span className="color-swatch-cross" />
      )}
    </button>
  );
}

type ColorPickerPopoverProps = {
  editor: BlockNoteEditor;
  activeTextColor: string | undefined;
  activeBgColor: string | undefined;
  onClose: () => void;
};

function ColorPickerPopover({ editor, activeTextColor, activeBgColor, onClose }: ColorPickerPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const applyTextColor = (value: string) => {
    editor.focus();
    if (value === "default") {
      editor.removeStyles({ textColor: activeTextColor as never });
    } else {
      editor.addStyles({ textColor: value as never });
    }
  };

  const applyBgColor = (value: string) => {
    editor.focus();
    if (value === "default") {
      editor.removeStyles({ backgroundColor: activeBgColor as never });
    } else {
      editor.addStyles({ backgroundColor: value as never });
    }
  };

  return (
    <div className="color-picker-popover" ref={ref}>
      <div className="color-picker-section-label">Cor do texto</div>
      <div className="color-picker-swatches">
        {TEXT_COLORS.map((c) => (
          <ColorSwatch
            key={c.value}
            label={c.label}
            hex={c.hex}
            isText
            active={c.value === "default" ? !activeTextColor : activeTextColor === c.value}
            onClick={() => applyTextColor(c.value)}
          />
        ))}
      </div>
      <div className="color-picker-section-label" style={{ marginTop: 10 }}>Cor de fundo</div>
      <div className="color-picker-swatches">
        {BG_COLORS.map((c) => (
          <ColorSwatch
            key={c.value}
            label={c.label}
            hex={c.hex}
            active={c.value === "default" ? !activeBgColor : activeBgColor === c.value}
            onClick={() => applyBgColor(c.value)}
          />
        ))}
      </div>
      <button
        className="color-picker-remove"
        type="button"
        onClick={() => {
          editor.focus();
          if (activeTextColor) editor.removeStyles({ textColor: activeTextColor as never });
          if (activeBgColor) editor.removeStyles({ backgroundColor: activeBgColor as never });
        }}
      >
        Remover cor
      </button>
    </div>
  );
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const [, setRevision] = useState(0);
  const [optimisticStyles, setOptimisticStyles] = useState<Record<string, boolean>>({});
  const [optimisticBlockType, setOptimisticBlockType] = useState<string | null>(null);
  const [showColors, setShowColors] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkInitialUrl, setLinkInitialUrl] = useState("");
  const [linkInitialText, setLinkInitialText] = useState("");
  const [showImageModal, setShowImageModal] = useState(false);
  const selectedBlocks = useSelectedBlocks(editor);
  const colorButtonRef = useRef<HTMLButtonElement>(null);

  const clearOptimistic = useCallback(() => {
    setOptimisticStyles({});
    setOptimisticBlockType(null);
    setRevision((r) => r + 1);
  }, []);

  useEditorChange(clearOptimistic, editor);
  useEditorSelectionChange(clearOptimistic, editor);

  const activeStyles = editor.getActiveStyles() as Record<string, unknown>;
  const activeBlock = selectedBlocks[0];
  const activeHeadingLevel =
    activeBlock?.type === "heading" ? Number(activeBlock.props.level) : null;
  const activeTextColor = activeStyles.textColor as string | undefined;
  const activeBgColor = activeStyles.backgroundColor as string | undefined;

  const refresh = useCallback(() => setRevision((r) => r + 1), []);

  const isStyleActive = (style: string) =>
    optimisticStyles[style] !== undefined
      ? optimisticStyles[style]
      : Boolean(activeStyles[style]);

  const isBlockActive = (type: string) =>
    optimisticBlockType !== null ? optimisticBlockType === type : activeBlock?.type === type;

  const isHeadingActive = (level: number) =>
    optimisticBlockType !== null
      ? optimisticBlockType === `heading${level}`
      : activeHeadingLevel === level;

  const toggleStyle = (style: "bold" | "italic" | "underline" | "strike" | "code") => {
    const next = !isStyleActive(style);
    setOptimisticStyles((prev) => ({ ...prev, [style]: next }));
    editor.focus();
    editor.toggleStyles({ [style]: true });
  };

  const setHeading = (level: 1 | 2 | 3) => {
    const isActive = isHeadingActive(level);
    setOptimisticBlockType(isActive ? "paragraph" : `heading${level}`);
    editor.focus();
    for (const block of selectedBlocks) {
      if (isActive) {
        editor.updateBlock(block, { type: "paragraph" });
      } else {
        editor.updateBlock(block, { type: "heading", props: { level } });
      }
    }
  };

  const setBlockType = (type: string) => {
    const isActive = isBlockActive(type);
    setOptimisticBlockType(isActive ? "paragraph" : type);
    editor.focus();
    for (const block of selectedBlocks) {
      if (isActive) {
        editor.updateBlock(block, { type: "paragraph" });
      } else {
        editor.updateBlock(block, { type: type as "bulletListItem" });
      }
    }
  };

  const insertBlock = (type: string) => {
    editor.focus();
    if (type === "table") {
      const tableItem = getDefaultReactSlashMenuItems(editor).find((i) => i.title === "Table");
      if (tableItem) {
        tableItem.onItemClick();
        refresh();
        return;
      }
    }
    const pos = editor.getTextCursorPosition();
    editor.insertBlocks([{ type: type as "divider" }], pos.block, "after");
    refresh();
  };

  const createLink = () => {
    const selectedText = editor.getSelectedText();
    const previousUrl = editor.getSelectedLinkUrl();
    setLinkInitialUrl(previousUrl || "");
    setLinkInitialText(selectedText || "");
    setShowLinkModal(true);
  };

  const handleLinkConfirm = (url: string, text: string) => {
    setShowLinkModal(false);
    editor.focus();
    editor.createLink(url, text || undefined);
    refresh();
  };

  const handleImageClick = () => setShowImageModal(true);

  const handleImageConfirm = (url: string) => {
    setShowImageModal(false);
    editor.focus();
    const pos = editor.getTextCursorPosition();
    editor.insertBlocks([{ type: "image", props: { url } }], pos.block, "after");
    refresh();
  };

  const hasColor = Boolean(activeTextColor || activeBgColor);
  const currentTextHex = TEXT_COLORS.find((c) => c.value === activeTextColor)?.hex;

  return (
    <>
    {showLinkModal && (
      <LinkModal
        initialUrl={linkInitialUrl}
        initialText={linkInitialText}
        onConfirm={handleLinkConfirm}
        onClose={() => setShowLinkModal(false)}
      />
    )}
    {showImageModal && (
      <ImageModal
        onConfirm={handleImageConfirm}
        onClose={() => setShowImageModal(false)}
      />
    )}
    <div className="editor-toolbar" role="toolbar" aria-label="Editor">
      <div className="editor-formatting-toolbar">
        <FormatButton active={isStyleActive("bold")} label="Negrito" onClick={() => toggleStyle("bold")}>
          <Bold size={17} />
        </FormatButton>
        <FormatButton active={isStyleActive("italic")} label="Itálico" onClick={() => toggleStyle("italic")}>
          <Italic size={17} />
        </FormatButton>
        <FormatButton active={isStyleActive("strike")} label="Tachado" onClick={() => toggleStyle("strike")}>
          <Strikethrough size={17} />
        </FormatButton>
        <FormatButton active={isStyleActive("underline")} label="Sublinhado" onClick={() => toggleStyle("underline")}>
          <Pencil size={16} />
        </FormatButton>
        <FormatButton active={isStyleActive("code")} label="Código inline" onClick={() => toggleStyle("code")}>
          <Code2 size={17} />
        </FormatButton>
        <FormatButton label="Link" onClick={createLink}>
          <Link size={17} />
        </FormatButton>
        <div className="color-button-wrapper">
          <button
            ref={colorButtonRef}
            aria-label="Cor"
            className={`format-button color-format-button ${hasColor ? "is-active" : ""}`}
            onClick={() => setShowColors((v) => !v)}
            title="Cor"
            type="button"
          >
            <span
              className="color-icon-letter"
              style={{ color: currentTextHex ?? "#c8cbd3" }}
            >A</span>
            <span
              className="color-indicator"
              style={{ background: currentTextHex ?? "rgba(255,255,255,0.25)" }}
            />
          </button>
          {showColors && (
            <ColorPickerPopover
              editor={editor}
              activeTextColor={activeTextColor}
              activeBgColor={activeBgColor}
              onClose={() => setShowColors(false)}
            />
          )}
        </div>
        <span className="format-separator" />
        <FormatButton active={isHeadingActive(1)} label="Título 1" onClick={() => setHeading(1)}>
          <Heading1 size={18} />
        </FormatButton>
        <FormatButton active={isHeadingActive(2)} label="Título 2" onClick={() => setHeading(2)}>
          <Heading2 size={18} />
        </FormatButton>
        <FormatButton active={isHeadingActive(3)} label="Título 3" onClick={() => setHeading(3)}>
          <Heading3 size={18} />
        </FormatButton>
        <span className="format-separator" />
        <FormatButton active={isBlockActive("quote")} label="Citação" onClick={() => setBlockType("quote")}>
          <Quote size={17} />
        </FormatButton>
        <FormatButton active={isBlockActive("bulletListItem")} label="Lista com Marcadores" onClick={() => setBlockType("bulletListItem")}>
          <List size={17} />
        </FormatButton>
        <FormatButton active={isBlockActive("numberedListItem")} label="Lista Numerada" onClick={() => setBlockType("numberedListItem")}>
          <ListOrdered size={17} />
        </FormatButton>
        <FormatButton active={isBlockActive("checkListItem")} label="Lista de Tarefas" onClick={() => setBlockType("checkListItem")}>
          <ListChecks size={17} />
        </FormatButton>
        <FormatButton active={isBlockActive("toggleListItem")} label="Toggle List" onClick={() => setBlockType("toggleListItem")}>
          <ChevronRight size={17} />
        </FormatButton>
        <span className="format-separator" />
        <FormatButton active={isBlockActive("codeBlock")} label="Bloco de Código" onClick={() => setBlockType("codeBlock")}>
          <Code2 size={17} />
        </FormatButton>
        <FormatButton label="Tabela" onClick={() => insertBlock("table")}>
          <Table size={17} />
        </FormatButton>
        <FormatButton label="Imagem" onClick={handleImageClick}>
          <Image size={17} />
        </FormatButton>
      </div>
    </div>
    </>
  );
}
