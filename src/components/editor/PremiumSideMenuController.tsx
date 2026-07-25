import { SideMenuExtension } from "@blocknote/core/extensions";
import {
  autoUpdate,
  FloatingPortal,
  offset,
  useDismiss,
  useFloating,
  useInteractions,
} from "@floating-ui/react";
import type { ReferenceType } from "@floating-ui/react";
import type { FC } from "react";
import { useCallback, useEffect, useMemo } from "react";
import {
  useBlockNoteEditor,
  useExtensionState,
} from "@blocknote/react";
import type { SideMenuProps } from "@blocknote/react";
import { getBlockElement, getSideMenuAnchorRect } from "./sideMenuAnchor";

type PremiumSideMenuControllerProps = {
  sideMenu: FC<SideMenuProps>;
};

export function PremiumSideMenuController({
  sideMenu: SideMenu,
}: PremiumSideMenuControllerProps) {
  const editor = useBlockNoteEditor();
  const state = useExtensionState(SideMenuExtension, {
    selector: (sideMenuState) =>
      sideMenuState === undefined
        ? undefined
        : {
            show: sideMenuState.show,
            block: sideMenuState.block,
          },
  });
  const { show, block } = state ?? {};

  const hideOnScroll = useCallback(() => {
    editor.getExtension(SideMenuExtension)?.hideMenuIfNotFrozen();
  }, [editor]);

  const whileElementsMounted = useCallback(
    (reference: ReferenceType, floating: HTMLElement, update: () => void) => {
      let initialized = false;

      return autoUpdate(
        reference,
        floating,
        () => {
          if (initialized) {
            hideOnScroll();
            return;
          }

          initialized = true;
          update();
        },
        {
          ancestorScroll: true,
          ancestorResize: false,
          elementResize: false,
          layoutShift: false,
        },
      );
    },
    [hideOnScroll],
  );

  const { context, floatingStyles, refs, update } = useFloating({
    open: Boolean(show && block),
    placement: "left",
    middleware: [offset(6)],
    whileElementsMounted,
  });
  const dismiss = useDismiss(context, { enabled: false });
  const { getFloatingProps } = useInteractions([dismiss]);

  const blockElement = useMemo(() => {
    if (!block) return null;

    const root = editor.domElement ?? editor.prosemirrorView.dom;
    return getBlockElement(block.id, root);
  }, [block, editor]);

  useEffect(() => {
    if (!blockElement) return;

    refs.setPositionReference({
      contextElement: blockElement,
      getBoundingClientRect: () => getSideMenuAnchorRect(blockElement),
    });
  }, [blockElement, refs]);

  useEffect(() => {
    if (!blockElement) return;

    const content = blockElement.querySelector<HTMLElement>(".bn-block-content");
    if (!content) return;

    let frameId: number | null = null;
    const scheduleUpdate = () => {
      if (frameId !== null) return;

      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        void update();
      });
    };

    const resizeObserver = new ResizeObserver(scheduleUpdate);
    const mutationObserver = new MutationObserver(scheduleUpdate);
    resizeObserver.observe(content);
    mutationObserver.observe(content, {
      childList: true,
      characterData: true,
      subtree: true,
    });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      if (frameId !== null) window.cancelAnimationFrame(frameId);
    };
  }, [blockElement, update]);

  if (!show || !block || !blockElement) return null;

  return (
    <FloatingPortal root={editor.portalElement}>
      <div
        ref={refs.setFloating}
        style={{ ...floatingStyles, display: "flex", zIndex: 20 }}
        {...getFloatingProps()}
      >
        <SideMenu />
      </div>
    </FloatingPortal>
  );
}
