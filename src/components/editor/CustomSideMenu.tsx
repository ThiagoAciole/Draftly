import { SideMenuExtension, SuggestionMenu } from "@blocknote/core/extensions";
import {
  AddBlockButton,
  DragHandleButton,
  DragHandleMenu,
  SideMenu,
  useBlockNoteEditor,
  useComponentsContext,
  useExtension,
  useExtensionState,
} from "@blocknote/react";
import type { SideMenuProps } from "@blocknote/react";
import { SeparatorHorizontal, SmilePlus, Trash2 } from "lucide-react";
import React from "react";
import { PremiumSideMenuController } from "./PremiumSideMenuController";
import { openQuickEmojiPicker } from "./quickEmoji";

function hasBlockContent(block: unknown) {
  const content = (block as { content?: unknown } | null)?.content;
  if (!Array.isArray(content)) return content != null;

  return content.some((item) => {
    if (typeof item !== "object" || item === null) return false;

    const inline = item as { text?: unknown; type?: unknown };
    return inline.type !== "text" || (typeof inline.text === "string" && inline.text.trim().length > 0);
  });
}

function PrimaryBlockAction(props: SideMenuProps) {
  const editor = useBlockNoteEditor();
  const Components = useComponentsContext()!;
  const block = useExtensionState(SideMenuExtension, {
    selector: (state) => state?.block,
  });

  if (!block || !hasBlockContent(block)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return <AddBlockButton {...(props as any)} />;
  }

  return (
    <Components.SideMenu.Button
      label="Deletar bloco"
      icon={<Trash2 size={15} />}
      onClick={() => editor.removeBlocks([block])}
    />
  );
}

function CustomDragHandleMenu() {
  const editor = useBlockNoteEditor();
  const Components = useComponentsContext()!;
  const suggestionMenu = useExtension(SuggestionMenu);
  const block = useExtensionState(SideMenuExtension, {
    selector: (state) => state?.block,
  });

  if (!block) return null;

  return (
    <DragHandleMenu>
      <Components.Generic.Menu.Item
        onClick={() => {
          editor.focus();
          editor.insertBlocks(
            [{ type: "divider" }],
            block,
            "after",
          );
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <SeparatorHorizontal size={15} />
          Dividir
        </span>
      </Components.Generic.Menu.Item>
      {!hasBlockContent(block) && (
        <Components.Generic.Menu.Item
          onClick={() => editor.removeBlocks([block])}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Trash2 size={15} />
            Deletar bloco
          </span>
        </Components.Generic.Menu.Item>
      )}
      <Components.Generic.Menu.Item onClick={() => openQuickEmojiPicker(suggestionMenu)}>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <SmilePlus size={15} />
          Adicionar emoji
        </span>
      </Components.Generic.Menu.Item>
    </DragHandleMenu>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AnyDragHandleButton: any = DragHandleButton;

function CustomSideMenu(props: SideMenuProps) {
  return (
    <SideMenu {...props}>
      <PrimaryBlockAction {...props} />
      <AnyDragHandleButton dragHandleMenu={CustomDragHandleMenu} />
    </SideMenu>
  );
}

export function CustomSideMenuController() {
  return <PremiumSideMenuController sideMenu={CustomSideMenu} />;
}
