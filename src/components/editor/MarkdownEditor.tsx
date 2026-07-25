import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import type { BlockNoteEditor } from "@blocknote/core";
import { convertFileSrc } from "@tauri-apps/api/core";
// @ts-ignore: CSS module declarations are not provided by @blocknote/core
import "@blocknote/core/fonts/inter.css";
import { filterSuggestionItems } from "@blocknote/core/extensions";
import { BlockNoteView } from "@blocknote/mantine";
// @ts-ignore: CSS module declarations are not provided by @blocknote/mantine
import "@blocknote/mantine/style.css";
import {
  BlockNoteViewEditor,
  LinkToolbarController,
  SuggestionMenuController,
  TableHandlesController,
  useCreateBlockNote,
} from "@blocknote/react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { CalloutBlock } from "./CalloutBlock";
import { CustomSideMenuController } from "./CustomSideMenu";
import { EditorToolbar } from "./EditorToolbar";
import { EditorModeSwitch } from "./EditorModeSwitch";
import {
  DraftlyExtendButton,
  DraftlyTableHandle,
} from "./TableHandleGripIcon";
import { getSlashMenuItems } from "./slashMenu";
import { normalizeImportedMarkdown } from "../../lib/normalizeImportedMarkdown";
import { exportBlocksToHtml } from "../../lib/fs";
import { storeImageAsset } from "../../lib/fs";
import { EXPORT_VISUAL_HTML_EVENT } from "../../lib/editorEvents";
import { handleSelectAllShortcut } from "../../lib/editorShortcuts";
import {
  getImageAssetAbsolutePath,
  isImportableImage,
  isRelativeImagePath,
} from "../../lib/imageAssets";

type MarkdownEditorProps = {
  name: string;
  path: string | null;
  markdown: string;
  onChange: (markdown: string) => void;
  onError: (message: string) => void;
};

const EMPTY_BLOCK = {
  type: "paragraph",
  content: "",
} as const;

const editorSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    callout: CalloutBlock(),
  },
});

const initialScrollThumb = {
  height: 0,
  top: 0,
  visible: false,
};

const MAX_IMPORTED_IMAGE_SIZE = 20 * 1024 * 1024;

function getExternalContentKey(path: string | null, markdown: string) {
  return `${path ?? ""}\u0000${markdown}`;
}

function resolveLocalImageSources(
  blocks: any[],
  documentPath: string | null,
  localImageSources: Map<string, string>,
) {
  if (!documentPath) return blocks;

  return blocks.map((block) => {
    const source = block.type === "image" ? block.props?.url : undefined;
    if (typeof source !== "string" || !isRelativeImagePath(source)) {
      return block;
    }

    const localSource = convertFileSrc(
      getImageAssetAbsolutePath(documentPath, source),
    );
    localImageSources.set(localSource, source);

    return {
      ...block,
      props: { ...block.props, url: localSource },
    };
  });
}

function getMarkdownBlocks(
  blocks: any[],
  localImageSources: Map<string, string>,
) {
  return blocks.map((block) => {
    const source = block.type === "image" ? block.props?.url : undefined;
    const relativeSource =
      typeof source === "string" ? localImageSources.get(source) : undefined;

    return relativeSource
      ? { ...block, props: { ...block.props, url: relativeSource } }
      : block;
  });
}

function parseMarkdown(
  editor: BlockNoteEditor<any, any, any>,
  markdown: string,
  documentPath: string | null,
  localImageSources: Map<string, string>,
) {
  const blocks = editor.tryParseMarkdownToBlocks(
    normalizeImportedMarkdown(markdown),
  );
  const nextBlocks = blocks.length > 0 ? blocks : [EMPTY_BLOCK];
  return resolveLocalImageSources(nextBlocks, documentPath, localImageSources);
}

export function MarkdownEditor({
  name,
  path,
  markdown,
  onChange,
  onError,
}: MarkdownEditorProps) {
  const scrollAreaRef = useRef<HTMLElement | null>(null);
  const hideScrollbarTimeoutRef = useRef<number | null>(null);
  const externalContent = useRef<string | null>(null);
  const localImageSources = useRef(new Map<string, string>());
  const isApplyingExternalContent = useRef(false);
  const [scrollThumb, setScrollThumb] = useState(initialScrollThumb);
  const [isScrollbarActive, setIsScrollbarActive] = useState(false);

  const editor = useCreateBlockNote({
    animations: false,
    schema: editorSchema,
    tables: {
      headers: true,
      splitCells: true,
      cellBackgroundColor: true,
      cellTextColor: true,
    },
  });

  useEffect(() => {
    const exportHtml = () => {
      void exportBlocksToHtml(name, editor.blocksToHTMLLossy(editor.document)).catch((error) => {
        onError(error instanceof Error ? error.message : "Não foi possível exportar o HTML.");
      });
    };

    window.addEventListener(EXPORT_VISUAL_HTML_EVENT, exportHtml);
    return () => window.removeEventListener(EXPORT_VISUAL_HTML_EVENT, exportHtml);
  }, [editor, name, onError]);

  const updateScrollThumb = useCallback(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;

    const scrollableHeight = scrollArea.scrollHeight - scrollArea.clientHeight;

    if (scrollableHeight <= 1) {
      setScrollThumb(initialScrollThumb);
      return;
    }

    const height = Math.max(
      72,
      (scrollArea.clientHeight / scrollArea.scrollHeight) *
        scrollArea.clientHeight,
    );
    const maxTop = scrollArea.clientHeight - height;
    const top =
      maxTop <= 0 ? 0 : (scrollArea.scrollTop / scrollableHeight) * maxTop;

    setScrollThumb({
      height,
      top,
      visible: true,
    });
  }, []);

  const showScrollbarTemporarily = useCallback(() => {
    setIsScrollbarActive(true);

    if (hideScrollbarTimeoutRef.current !== null) {
      window.clearTimeout(hideScrollbarTimeoutRef.current);
    }

    hideScrollbarTimeoutRef.current = window.setTimeout(() => {
      setIsScrollbarActive(false);
      hideScrollbarTimeoutRef.current = null;
    }, 900);
  }, []);

  useEffect(() => {
    const contentKey = getExternalContentKey(path, markdown);
    if (externalContent.current === contentKey) return;

    externalContent.current = contentKey;
    localImageSources.current.clear();
    isApplyingExternalContent.current = true;

    try {
      editor.replaceBlocks(
        editor.document,
        parseMarkdown(
          editor,
          markdown,
          path,
          localImageSources.current,
        ) as never,
      );
    } finally {
      isApplyingExternalContent.current = false;
      window.requestAnimationFrame(updateScrollThumb);
    }
  }, [editor, markdown, path, updateScrollThumb]);

  const handleEditorChange = (nextEditor: BlockNoteEditor<any, any, any>) => {
    if (isApplyingExternalContent.current) return;

    const nextMarkdown = nextEditor
      .blocksToMarkdownLossy(
        getMarkdownBlocks(nextEditor.document, localImageSources.current),
      )
      .trimEnd();
    externalContent.current = getExternalContentKey(path, nextMarkdown);
    onChange(nextMarkdown);
    window.requestAnimationFrame(updateScrollThumb);
  };

  const importImageFiles = useCallback(
    async (files: File[]) => {
      const images = files.filter(isImportableImage);
      if (images.length === 0) return;

      if (!path) {
        onError("Salve o arquivo Markdown antes de adicionar imagens locais.");
        return;
      }

      const imageTooLarge = images.find(
        (file) => file.size > MAX_IMPORTED_IMAGE_SIZE,
      );
      if (imageTooLarge) {
        onError(`A imagem “${imageTooLarge.name}” excede o limite de 20 MB.`);
        return;
      }

      try {
        const imageBlocks = [] as Array<{ type: "image"; props: { url: string } }>;
        for (const file of images) {
          const asset = await storeImageAsset(path, file);
          const localSource = convertFileSrc(asset.absolutePath);
          localImageSources.current.set(localSource, asset.relativePath);
          imageBlocks.push({ type: "image", props: { url: localSource } });
        }

        const referenceBlock = editor.getTextCursorPosition().block;
        editor.insertBlocks(imageBlocks as never, referenceBlock, "after");
        editor.focus();
      } catch (error) {
        onError(
          error instanceof Error
            ? error.message
            : "NÃ£o foi possÃ­vel adicionar esta imagem.",
        );
      }
    },
    [editor, onError, path],
  );

  useEffect(() => {
    const editorElement = editor.domElement;
    if (!editorElement) return;

    const getImageFiles = (transfer: DataTransfer | null) =>
      transfer ? Array.from(transfer.files).filter(isImportableImage) : [];

    const handleDragOver = (event: DragEvent) => {
      if (getImageFiles(event.dataTransfer).length > 0) event.preventDefault();
    };

    const handleDrop = (event: DragEvent) => {
      const images = getImageFiles(event.dataTransfer);
      if (images.length === 0) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      void importImageFiles(images);
    };

    const handlePaste = (event: ClipboardEvent) => {
      const images = getImageFiles(event.clipboardData);
      if (images.length === 0) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      void importImageFiles(images);
    };

    editorElement.addEventListener("dragover", handleDragOver, true);
    editorElement.addEventListener("drop", handleDrop, true);
    editorElement.addEventListener("paste", handlePaste, true);

    return () => {
      editorElement.removeEventListener("dragover", handleDragOver, true);
      editorElement.removeEventListener("drop", handleDrop, true);
      editorElement.removeEventListener("paste", handlePaste, true);
    };
  }, [editor, importImageFiles]);

  const handleEditorScroll = () => {
    updateScrollThumb();
    showScrollbarTemporarily();
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;

      const key = event.key.toLowerCase();

      const isEditorFocused = editor.domElement?.contains(document.activeElement);
      if (!isEditorFocused) return;

      if (key === "z") {
        event.preventDefault();
        if (event.shiftKey) editor.redo();
        else editor.undo();
        return;
      }

      if (key === "y") {
        event.preventDefault();
        editor.redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editor]);

  useEffect(() => {
    const editorElement = editor.domElement;
    if (!editorElement) return;

    const handleSelectAll = (event: KeyboardEvent) => {
      handleSelectAllShortcut(event, () => {
        editor._tiptapEditor.commands.selectAll();
      });
    };

    editorElement.addEventListener("keydown", handleSelectAll, true);
    return () => editorElement.removeEventListener("keydown", handleSelectAll, true);
  }, [editor]);

  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;

    const resizeObserver = new ResizeObserver(updateScrollThumb);
    resizeObserver.observe(scrollArea);

    if (scrollArea.firstElementChild) {
      resizeObserver.observe(scrollArea.firstElementChild);
    }

    window.addEventListener("resize", updateScrollThumb);
    window.requestAnimationFrame(updateScrollThumb);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateScrollThumb);
      if (hideScrollbarTimeoutRef.current !== null) {
        window.clearTimeout(hideScrollbarTimeoutRef.current);
      }
    };
  }, [updateScrollThumb]);

  // Wheel scroll handler (needed because overflow: hidden prevents native wheel scrolling)
  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;

    const handleWheel = (e: WheelEvent) => {
      const maxScroll = scrollArea.scrollHeight - scrollArea.clientHeight;
      if (maxScroll <= 0) return;

      // Block scrolling if it would overflow in either direction
      const atTop = scrollArea.scrollTop <= 0 && e.deltaY < 0;
      const atBottom = scrollArea.scrollTop >= maxScroll && e.deltaY > 0;
      if (atTop || atBottom) return;

      e.preventDefault();
      scrollArea.scrollTop += e.deltaY;
      updateScrollThumb();
      showScrollbarTemporarily();
    };

    scrollArea.addEventListener("wheel", handleWheel, { passive: false });
    return () => scrollArea.removeEventListener("wheel", handleWheel);
  }, [updateScrollThumb, showScrollbarTemporarily]);

  const handleScrollbarPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea || !scrollThumb.visible) return;

    event.preventDefault();
    setIsScrollbarActive(true);

    const startY = event.clientY;
    const startScrollTop = scrollArea.scrollTop;
    const scrollableHeight = scrollArea.scrollHeight - scrollArea.clientHeight;
    const draggableHeight = scrollArea.clientHeight - scrollThumb.height;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (draggableHeight <= 0) return;

      const delta = moveEvent.clientY - startY;
      scrollArea.scrollTop =
        startScrollTop + (delta / draggableHeight) * scrollableHeight;
      updateScrollThumb();
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      showScrollbarTemporarily();
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  return (
    <section className="editor-surface">
      <div className="editor-toolbar-row">
        <EditorToolbar editor={editor} />
        <EditorModeSwitch />
      </div>
      <BlockNoteView
        className="blocknote-editor"
        editor={editor}
        formattingToolbar={false}
        sideMenu={false}
        slashMenu={false}
        linkToolbar={false}
        emojiPicker
        tableHandles={false}
        onChange={handleEditorChange}
        renderEditor={false}
        theme="dark"
      >
        <CustomSideMenuController />
        <TableHandlesController
          extendButton={DraftlyExtendButton}
          tableHandle={DraftlyTableHandle}
        />
        <LinkToolbarController />
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={async (query) =>
            filterSuggestionItems(getSlashMenuItems(editor), query)
          }
        />
        <div className="editor-scroll-frame">
          <main
            className="editor-scroll"
            ref={scrollAreaRef}
            onScroll={handleEditorScroll}
          >
            <div className="editor-canvas">
              <BlockNoteViewEditor />
            </div>
          </main>
          <div
            className={`editor-scrollbar ${
              scrollThumb.visible && isScrollbarActive ? "is-visible" : ""
            }`}
            aria-hidden="true"
          >
            <div
              className="editor-scrollbar-thumb"
              style={{
                height: scrollThumb.height,
                transform: `translateY(${scrollThumb.top}px)`,
              }}
              onPointerDown={handleScrollbarPointerDown}
            />
          </div>
        </div>
      </BlockNoteView>
    </section>
  );
}
