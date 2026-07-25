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

function DeleteBlockButton() {
  const editor = useBlockNoteEditor();
  const Components = useComponentsContext()!;

  const block = useExtensionState(SideMenuExtension, {
    selector: (state) => state?.block,
  });

  if (!block) return null;

  return (
    <Components.SideMenu.Button
      label="Deletar bloco"
      icon={<Trash2 size={15} />}
      onClick={() => editor.removeBlocks([block])}
    />
  );
}

function QuickEmojiButton() {
  const Components = useComponentsContext()!;
  const suggestionMenu = useExtension(SuggestionMenu);

  return (
    <Components.SideMenu.Button
      label="Adicionar emoji"
      icon={<SmilePlus size={15} />}
      onClick={() => openQuickEmojiPicker(suggestionMenu)}
    />
  );
}

function CustomDragHandleMenu() {
  const editor = useBlockNoteEditor();
  const Components = useComponentsContext()!;

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
    </DragHandleMenu>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AnyDragHandleButton: any = DragHandleButton;

function CustomSideMenu(props: SideMenuProps) {
  return (
    <SideMenu {...props}>
      <DeleteBlockButton />
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <AddBlockButton {...(props as any)} />
      <QuickEmojiButton />
      <AnyDragHandleButton dragHandleMenu={CustomDragHandleMenu} />
    </SideMenu>
  );
}

export function CustomSideMenuController() {
  return <PremiumSideMenuController sideMenu={CustomSideMenu} />;
}
