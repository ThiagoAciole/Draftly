import type { BlockNoteEditor } from "@blocknote/core";
import {
  useEditorChange,
  useEditorSelectionChange,
  useSelectedBlocks,
} from "@blocknote/react";
import {
  ArrowLeft,
  ArrowRight,
  Bold,
  ChevronLeft,
  ChevronRight,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  Image,
  Italic,
  Link,
  Lightbulb,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Pencil,
  Quote,
  Redo2,
  SquareCode,
  Strikethrough,
  Table,
  Text,
  Type,
  Undo2,
  UploadCloud,
} from "lucide-react";
import type {
  KeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { parseDelimitedTable } from "../../lib/tableConversion";
import { getTablePickerPosition } from "./tablePickerPosition";

type EditorToolbarProps = {
  editor: BlockNoteEditor<any, any, any>;
};

type FormatButtonProps = {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
};

function FormatButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: FormatButtonProps) {
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

function LinkModal({
  initialUrl,
  initialText,
  onConfirm,
  onClose,
}: LinkModalProps) {
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
    <div
      className="link-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="link-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Inserir link"
      >
        <div className="link-modal-header">
          <span className="link-modal-title">Inserir link</span>
          <button
            className="link-modal-close"
            type="button"
            aria-label="Fechar"
            onClick={onClose}
          >
            ✕
          </button>
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
            Texto exibido{" "}
            <span className="link-modal-optional">(opcional)</span>
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

const MAX_EMBEDDED_IMAGE_SIZE = 5 * 1024 * 1024;

function ImageModal({ onConfirm, onClose }: ImageModalProps) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Selecione um arquivo de imagem válido.");
      return;
    }
    if (file.size > MAX_EMBEDDED_IMAGE_SIZE) {
      setError("A imagem deve ter no máximo 5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => setError("Não foi possível ler esta imagem.");
    reader.onload = () => {
      if (typeof reader.result === "string") onConfirm(reader.result);
      else setError("Não foi possível ler esta imagem.");
    };
    reader.readAsDataURL(file);
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
    <div
      className="link-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="link-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Inserir imagem"
      >
        <div className="link-modal-header">
          <span className="link-modal-title">Insira a Imagem</span>
          <button
            className="link-modal-close"
            type="button"
            aria-label="Fechar"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="link-modal-body">
          <div
            className={`image-dropzone ${dragging ? "is-dragging" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleFileInput}
            />
            <div className="image-dropzone-icon">
              <UploadCloud size={28} />
            </div>
            <p className="image-dropzone-title">
              Arraste e solte ou clique para selecionar
            </p>
            <p className="image-dropzone-hint">
              PNG, JPG, GIF ou WebP — até 5 MB
            </p>
            <button
              className="image-dropzone-browse"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              Escolher arquivo
            </button>
          </div>
          {error ? (
            <p className="image-dropzone-error" role="alert">
              {error}
            </p>
          ) : null}
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

function ColorSwatch({
  label,
  hex,
  active,
  onClick,
  isText,
}: ColorSwatchProps) {
  return (
    <button
      aria-label={label}
      className={`color-swatch ${active ? "is-active" : ""}`}
      onClick={onClick}
      title={label}
      type="button"
      style={
        isText
          ? { color: hex ?? "inherit" }
          : { background: hex ?? "transparent" }
      }
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

function ColorPickerPopover({
  editor,
  activeTextColor,
  activeBgColor,
  onClose,
}: ColorPickerPopoverProps) {
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
            active={
              c.value === "default"
                ? !activeTextColor
                : activeTextColor === c.value
            }
            onClick={() => applyTextColor(c.value)}
          />
        ))}
      </div>
      <div className="color-picker-section-label" style={{ marginTop: 10 }}>
        Cor de fundo
      </div>
      <div className="color-picker-swatches">
        {BG_COLORS.map((c) => (
          <ColorSwatch
            key={c.value}
            label={c.label}
            hex={c.hex}
            active={
              c.value === "default" ? !activeBgColor : activeBgColor === c.value
            }
            onClick={() => applyBgColor(c.value)}
          />
        ))}
      </div>
      <button
        className="color-picker-remove"
        type="button"
        onClick={() => {
          editor.focus();
          if (activeTextColor)
            editor.removeStyles({ textColor: activeTextColor as never });
          if (activeBgColor)
            editor.removeStyles({ backgroundColor: activeBgColor as never });
        }}
      >
        Remover cor
      </button>
    </div>
  );
}

type TablePickerPopoverProps = {
  anchor: DOMRect;
  conversionRows: string[][] | null;
  onClose: () => void;
  onConvert: () => void;
  onInsert: (rows: number, columns: number) => void;
};

function TablePickerPopover({
  anchor,
  conversionRows,
  onClose,
  onConvert,
  onInsert,
}: TablePickerPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [hoveredSize, setHoveredSize] = useState({ columns: 2, rows: 1 });
  const position = getTablePickerPosition(anchor, window.innerWidth);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return createPortal(
    <div
      className="color-picker-popover table-picker-popover"
      ref={ref}
      role="dialog"
      aria-label="Inserir tabela"
      style={{
        left: position.left,
        position: "fixed",
        top: position.top,
        transform: "none",
      }}
    >
      <div className="table-picker-header">
        <button
          aria-label="Fechar seletor de tabela"
          className="table-picker-back"
          onClick={onClose}
          type="button"
        >
          <ArrowLeft size={17} />
        </button>
        <span>{hoveredSize.columns} × {hoveredSize.rows}</span>
      </div>
      <div className="table-picker-grid">
        {Array.from({ length: 8 }, (_, rowIndex) =>
          Array.from({ length: 8 }, (_, columnIndex) => {
            const rows = rowIndex + 1;
            const columns = columnIndex + 1;
            const selected =
              columns <= hoveredSize.columns && rows <= hoveredSize.rows;

            return (
              <button
                key={`${rows}x${columns}`}
                aria-label={`${columns} × ${rows}`}
                className={`table-picker-option ${selected ? "is-selected" : ""}`}
                onClick={() => onInsert(rows, columns)}
                onMouseEnter={() => setHoveredSize({ columns, rows })}
                type="button"
              />
            );
          }),
        )}
      </div>
      {conversionRows ? (
        <button
          className="color-picker-remove table-picker-convert"
          type="button"
          onClick={onConvert}
        >
          Converter seleção em tabela ({conversionRows.length} ×{" "}
          {conversionRows[0]?.length ?? 0})
        </button>
      ) : (
        <p className="table-picker-hint">Clique para inserir uma tabela.</p>
      )}
    </div>
    ,
    document.body,
  );
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const [, setRevision] = useState(0);
  const [optimisticStyles, setOptimisticStyles] = useState<
    Record<string, boolean>
  >({});
  const [optimisticBlockType, setOptimisticBlockType] = useState<string | null>(
    null,
  );
  const [showColors, setShowColors] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkInitialUrl, setLinkInitialUrl] = useState("");
  const [linkInitialText, setLinkInitialText] = useState("");
  const [toolbarScroll, setToolbarScroll] = useState({
    left: false,
    right: false,
  });
  const [showImageModal, setShowImageModal] = useState(false);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [tablePickerAnchor, setTablePickerAnchor] = useState<DOMRect | null>(null);
  const [tableConversionRows, setTableConversionRows] = useState<
    string[][] | null
  >(null);
  const [showAdditionalHeadings, setShowAdditionalHeadings] = useState(false);
  const selectedBlocks = useSelectedBlocks(editor);
  const colorButtonRef = useRef<HTMLButtonElement>(null);
  const tableButtonRef = useRef<HTMLDivElement>(null);
  const toolbarScrollRef = useRef<HTMLDivElement>(null);
  const toolbarDragRef = useRef({
    pointerId: 0,
    startX: 0,
    startScrollLeft: 0,
    moved: false,
  });
  const suppressToolbarClickRef = useRef(false);

  const clearOptimistic = useCallback(() => {
    setOptimisticStyles({});
    setOptimisticBlockType(null);
    setRevision((r) => r + 1);
  }, []);

  useEditorChange(clearOptimistic, editor);
  useEditorSelectionChange(clearOptimistic, editor);

  const activeStyles = editor.getActiveStyles() as Record<string, unknown>;
  const activeTextColor = activeStyles.textColor as string | undefined;
  const activeBgColor = activeStyles.backgroundColor as string | undefined;

  const refresh = useCallback(() => setRevision((r) => r + 1), []);

  const updateToolbarScroll = useCallback(() => {
    const element = toolbarScrollRef.current;
    if (!element) return;

    const maxScrollLeft = element.scrollWidth - element.clientWidth;
    setToolbarScroll({
      left: element.scrollLeft > 1,
      right: maxScrollLeft - element.scrollLeft > 1,
    });
  }, []);

  useEffect(() => {
    const element = toolbarScrollRef.current;
    if (!element) return;

    updateToolbarScroll();
    const observer = new ResizeObserver(updateToolbarScroll);
    observer.observe(element);
    return () => observer.disconnect();
  }, [updateToolbarScroll]);

  const scrollToolbar = (direction: -1 | 1) => {
    toolbarScrollRef.current?.scrollBy({
      left: direction * 220,
      behavior: "smooth",
    });
  };

  const handleToolbarPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const element = event.currentTarget;
    toolbarDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: element.scrollLeft,
      moved: false,
    };

    // Use global listeners instead of setPointerCapture to avoid
    // redirecting click events away from toolbar buttons.
    const handleMove = (e: PointerEvent) => {
      if (e.pointerId !== toolbarDragRef.current.pointerId) return;
      const distance = e.clientX - toolbarDragRef.current.startX;
      if (Math.abs(distance) > 3) {
        toolbarDragRef.current.moved = true;
        element.scrollLeft = toolbarDragRef.current.startScrollLeft - distance;
        updateToolbarScroll();
        e.preventDefault();
      }
    };

    const handleUp = (e: PointerEvent) => {
      if (e.pointerId !== toolbarDragRef.current.pointerId) return;
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      if (toolbarDragRef.current.moved) {
        suppressToolbarClickRef.current = true;
        requestAnimationFrame(() => {
          suppressToolbarClickRef.current = false;
        });
      }
      toolbarDragRef.current.pointerId = 0;
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  const isStyleActive = (style: string) =>
    optimisticStyles[style] !== undefined
      ? optimisticStyles[style]
      : Boolean(activeStyles[style]);

  const isBlockActive = (type: string) =>
    optimisticBlockType !== null
      ? optimisticBlockType === type
      : selectedBlocks.length > 0 &&
        selectedBlocks.every((block) => block.type === type);

  const isHeadingActive = (level: number) =>
    optimisticBlockType !== null
      ? optimisticBlockType === `heading${level}`
      : selectedBlocks.length > 0 &&
        selectedBlocks.every(
          (block) =>
            block.type === "heading" && Number(block.props.level) === level,
        );

  const toggleStyle = (
    style: "bold" | "italic" | "underline" | "strike" | "code",
  ) => {
    const next = !isStyleActive(style);
    setOptimisticStyles((prev) => ({ ...prev, [style]: next }));
    editor.focus();
    editor.toggleStyles({ [style]: true });
  };

  const getBlocksToChange = () =>
    selectedBlocks.length > 0
      ? selectedBlocks
      : [editor.getTextCursorPosition().block];

  const setHeading = (level: 1 | 2 | 3 | 4 | 5 | 6) => {
    const isActive = isHeadingActive(level);
    setOptimisticBlockType(isActive ? "paragraph" : `heading${level}`);
    editor.focus();
    for (const block of getBlocksToChange()) {
      if (isActive) {
        editor.updateBlock(block, { type: "paragraph" });
      } else {
        editor.updateBlock(block, { type: "heading", props: { level } });
      }
    }
  };

  const setBlockType = (type: string, force = false) => {
    const isActive = !force && isBlockActive(type);
    setOptimisticBlockType(isActive ? "paragraph" : type);
    editor.focus();
    for (const block of getBlocksToChange()) {
      if (isActive) {
        editor.updateBlock(block, { type: "paragraph" });
      } else {
        editor.updateBlock(block, { type: type as "bulletListItem" });
      }
    }
  };

  const getSelectedDelimitedRows = () => {
    const tiptapEditor = editor._tiptapEditor;
    const selection = tiptapEditor.state.selection;
    if (selection.empty) return null;

    const { $from, $to } = selection;
    if (
      $from.parentOffset !== 0 ||
      $to.parentOffset !== $to.parent.content.size
    ) {
      return null;
    }

    return parseDelimitedTable(
      tiptapEditor.state.doc.textBetween(selection.from, selection.to, "\n"),
    );
  };

  const createTableBlock = (rows: string[][]) => ({
    type: "table",
    content: {
      type: "tableContent",
      rows: rows.map((cells) => ({ cells })),
    },
  });

  const insertTable = (rows: number, columns: number) => {
    editor.focus();
    const referenceBlock =
      getBlocksToChange().at(-1) ?? editor.getTextCursorPosition().block;
    const emptyRows = Array.from({ length: rows }, () =>
      Array(columns).fill(""),
    );
    editor.insertBlocks(
      [createTableBlock(emptyRows) as never],
      referenceBlock,
      "after",
    );
    setShowTablePicker(false);
    refresh();
  };

  const convertSelectionToTable = () => {
    if (!tableConversionRows) return;

    editor.focus();
    editor.replaceBlocks(getBlocksToChange(), [
      createTableBlock(tableConversionRows) as never,
    ]);
    setShowTablePicker(false);
    setTableConversionRows(null);
    refresh();
  };

  const openTablePicker = () => {
    if (showTablePicker) {
      setShowTablePicker(false);
      return;
    }

    const anchor = tableButtonRef.current?.getBoundingClientRect();
    if (!anchor) return;

    setTablePickerAnchor(anchor);
    setTableConversionRows(getSelectedDelimitedRows());
    setShowTablePicker(true);
  };

  const insertDivider = () => {
    editor.focus();
    const referenceBlock =
      getBlocksToChange().at(-1) ?? editor.getTextCursorPosition().block;
    editor.insertBlocks([{ type: "divider" }], referenceBlock, "after");
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

  const undo = () => {
    editor.focus();
    editor.undo();
    refresh();
  };

  const redo = () => {
    editor.focus();
    editor.redo();
    refresh();
  };

  const handleImageConfirm = (url: string) => {
    setShowImageModal(false);
    editor.focus();
    const pos = editor.getTextCursorPosition();
    editor.insertBlocks(
      [{ type: "image", props: { url } }],
      pos.block,
      "after",
    );
    refresh();
  };

  const hasColor = Boolean(activeTextColor || activeBgColor);
  const currentTextHex = TEXT_COLORS.find(
    (c) => c.value === activeTextColor,
  )?.hex;

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
      <div className="editor-history-controls" role="toolbar" aria-label="Histórico de edição">
        <FormatButton label="Desfazer" onClick={undo}>
          <Undo2 size={17} />
        </FormatButton>
        <FormatButton label="Refazer" onClick={redo}>
          <Redo2 size={17} />
        </FormatButton>
      </div>
      <div
        className={`editor-toolbar ${toolbarScroll.left || toolbarScroll.right ? "is-scrollable" : ""}`}
        role="toolbar"
        aria-label="Editor"
      >
        <button
          className="editor-toolbar-scroll-button is-left"
          type="button"
          aria-label="Ver ferramentas anteriores"
          title="Ferramentas anteriores"
          disabled={!toolbarScroll.left}
          onClick={() => scrollToolbar(-1)}
        >
          <ChevronLeft size={16} />
        </button>
        <div
          ref={toolbarScrollRef}
          className="editor-toolbar-scroll-area"
          onScroll={updateToolbarScroll}
          onPointerDown={handleToolbarPointerDown}
          onClickCapture={(event) => {
            if (!suppressToolbarClickRef.current) return;
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <div className="editor-formatting-toolbar">
            <FormatButton
              active={isStyleActive("bold")}
              label="Negrito"
              onClick={() => toggleStyle("bold")}
            >
              <Bold size={17} />
            </FormatButton>
            <FormatButton
              active={isStyleActive("italic")}
              label="Itálico"
              onClick={() => toggleStyle("italic")}
            >
              <Italic size={17} />
            </FormatButton>
            <FormatButton
              active={isStyleActive("strike")}
              label="Tachado"
              onClick={() => toggleStyle("strike")}
            >
              <Strikethrough size={17} />
            </FormatButton>
            <FormatButton
              active={isStyleActive("underline")}
              label="Sublinhado"
              onClick={() => toggleStyle("underline")}
            >
              <Pencil size={16} />
            </FormatButton>
            <FormatButton
              active={isStyleActive("code")}
              label="Código inline"
              onClick={() => toggleStyle("code")}
            >
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
                >
                  A
                </span>
                <span
                  className="color-indicator"
                  style={{
                    background: currentTextHex ?? "rgba(255,255,255,0.25)",
                  }}
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
            <FormatButton
              active={isBlockActive("paragraph")}
              label="Parágrafo"
              onClick={() => setBlockType("paragraph", true)}
            >
              <Type size={17} />
            </FormatButton>
            <FormatButton
              active={isHeadingActive(1)}
              label="Título 1"
              onClick={() => setHeading(1)}
            >
              <Heading1 size={18} />
            </FormatButton>
            <FormatButton
              active={isHeadingActive(2)}
              label="Título 2"
              onClick={() => setHeading(2)}
            >
              <Heading2 size={18} />
            </FormatButton>
            <FormatButton
              active={isHeadingActive(3)}
              label="Título 3"
              onClick={() => setHeading(3)}
            >
              <Heading3 size={18} />
            </FormatButton>
            {!showAdditionalHeadings ? (
              <FormatButton
                label="Mostrar mais títulos"
                onClick={() => setShowAdditionalHeadings(true)}
              >
                <ChevronRight size={17} />
              </FormatButton>
            ) : null}
            {showAdditionalHeadings ? (
              <>
                <FormatButton
                  active={isHeadingActive(4)}
                  label="Título 4"
                  onClick={() => setHeading(4)}
                >
                  <Heading4 size={18} />
                </FormatButton>
                <FormatButton
                  active={isHeadingActive(5)}
                  label="Título 5"
                  onClick={() => setHeading(5)}
                >
                  <Heading5 size={18} />
                </FormatButton>
                <FormatButton
                  active={isHeadingActive(6)}
                  label="Título 6"
                  onClick={() => setHeading(6)}
                >
                  <Heading6 size={18} />
                </FormatButton>
                <FormatButton
                  label="Ocultar títulos adicionais"
                  onClick={() => setShowAdditionalHeadings(false)}
                >
                  <ChevronLeft size={17} />
                </FormatButton>
              </>
            ) : null}
            <span className="format-separator" />
            <FormatButton
              active={isBlockActive("quote")}
              label="Citação"
              onClick={() => setBlockType("quote")}
            >
              <Quote size={17} />
            </FormatButton>
            <FormatButton
              active={isBlockActive("callout")}
              label="Frase de destaque"
              onClick={() => setBlockType("callout")}
            >
              <Lightbulb size={17} />
            </FormatButton>
            <FormatButton
              active={isBlockActive("bulletListItem")}
              label="Lista com Marcadores"
              onClick={() => setBlockType("bulletListItem")}
            >
              <List size={17} />
            </FormatButton>
            <FormatButton
              active={isBlockActive("numberedListItem")}
              label="Lista Numerada"
              onClick={() => setBlockType("numberedListItem")}
            >
              <ListOrdered size={17} />
            </FormatButton>
            <FormatButton
              active={isBlockActive("checkListItem")}
              label="Lista de Tarefas"
              onClick={() => setBlockType("checkListItem")}
            >
              <ListChecks size={17} />
            </FormatButton>
            <span className="format-separator" />
            <FormatButton
              active={isBlockActive("codeBlock")}
              label="Bloco de Código"
              onClick={() => setBlockType("codeBlock")}
            >
              <SquareCode size={17} />
            </FormatButton>
            <div className="color-button-wrapper" ref={tableButtonRef}>
              <FormatButton label="Tabela" onClick={openTablePicker}>
                <Table size={17} />
              </FormatButton>
              {showTablePicker && tablePickerAnchor ? (
                <TablePickerPopover
                  anchor={tablePickerAnchor}
                  conversionRows={tableConversionRows}
                  onClose={() => {
                    setShowTablePicker(false);
                    setTablePickerAnchor(null);
                  }}
                  onConvert={convertSelectionToTable}
                  onInsert={insertTable}
                />
              ) : null}
            </div>
            <FormatButton label="Divisor" onClick={insertDivider}>
              <Minus size={17} />
            </FormatButton>
            <FormatButton label="Imagem" onClick={handleImageClick}>
              <Image size={17} />
            </FormatButton>
          </div>
        </div>
        <button
          className="editor-toolbar-scroll-button is-right"
          type="button"
          aria-label="Ver próximas ferramentas"
          title="Próximas ferramentas"
          disabled={!toolbarScroll.right}
          onClick={() => scrollToolbar(1)}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </>
  );
}
