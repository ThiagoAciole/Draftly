import type { BlockNoteEditor } from "@blocknote/core";
// @ts-ignore: CSS module declarations are not provided by @blocknote/core
import "@blocknote/core/fonts/inter.css";
import { filterSuggestionItems } from "@blocknote/core/extensions";
import { BlockNoteView } from "@blocknote/mantine";
// @ts-ignore: CSS module declarations are not provided by @blocknote/mantine
import "@blocknote/mantine/style.css";
import {
  BlockNoteViewEditor,
  SuggestionMenuController,
  useCreateBlockNote,
} from "@blocknote/react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { CustomSideMenuController } from "./CustomSideMenu";
import { EditorToolbar } from "./EditorToolbar";
import { EditorModeSwitch } from "./EditorModeSwitch";
import { getSlashMenuItems } from "./slashMenu";

type MarkdownEditorProps = {
  markdown: string;
  onChange: (markdown: string) => void;
  onSave: () => void;
};

const EMPTY_BLOCK = {
  type: "paragraph",
  content: "",
} as const;

const initialScrollThumb = {
  height: 0,
  top: 0,
  visible: false,
};

function parseMarkdown(editor: BlockNoteEditor, markdown: string) {
  const blocks = editor.tryParseMarkdownToBlocks(markdown);
  return blocks.length > 0 ? blocks : [EMPTY_BLOCK];
}

export function MarkdownEditor({
  markdown,
  onChange,
  onSave,
}: MarkdownEditorProps) {
  const scrollAreaRef = useRef<HTMLElement | null>(null);
  const hideScrollbarTimeoutRef = useRef<number | null>(null);
  const externalMarkdown = useRef<string | null>(null);
  const isApplyingExternalContent = useRef(false);
  const [scrollThumb, setScrollThumb] = useState(initialScrollThumb);
  const [isScrollbarActive, setIsScrollbarActive] = useState(false);

  const editor = useCreateBlockNote({
    animations: false,
    links: {
      onClick: () => false,
    },
  });

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
    if (externalMarkdown.current === markdown) return;

    externalMarkdown.current = markdown;
    isApplyingExternalContent.current = true;

    try {
      editor.replaceBlocks(editor.document, parseMarkdown(editor, markdown));
    } finally {
      isApplyingExternalContent.current = false;
      window.requestAnimationFrame(updateScrollThumb);
    }
  }, [editor, markdown, updateScrollThumb]);

  const handleEditorChange = (nextEditor: BlockNoteEditor) => {
    if (isApplyingExternalContent.current) return;

    const nextMarkdown = nextEditor
      .blocksToMarkdownLossy(nextEditor.document)
      .trimEnd();
    externalMarkdown.current = nextMarkdown;
    onChange(nextMarkdown);
    window.requestAnimationFrame(updateScrollThumb);
  };

  const handleEditorScroll = () => {
    updateScrollThumb();
    showScrollbarTemporarily();
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        onSave();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSave]);

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
        emojiPicker={false}
        formattingToolbar={false}
        sideMenu={false}
        slashMenu={false}
        onChange={handleEditorChange}
        renderEditor={false}
        theme="dark"
      >
        <CustomSideMenuController />
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
