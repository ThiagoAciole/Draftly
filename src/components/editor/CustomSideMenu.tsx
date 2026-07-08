import { SideMenuExtension } from "@blocknote/core/extensions";
import {
  AddBlockButton,
  DragHandleButton,
  DragHandleMenu,
  SideMenu,
  SideMenuController,
  useBlockNoteEditor,
  useComponentsContext,
  useExtensionState,
} from "@blocknote/react";
import type { SideMenuProps } from "@blocknote/react";
import { SeparatorHorizontal, Trash2 } from "lucide-react";
import React from "react";

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
      icon={<Trash2 size={15} onClick={() => editor.removeBlocks([block])} />}
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
  const referencePos = useExtensionState(SideMenuExtension, {
    selector: (s) => s?.referencePos,
  });
  const blockHeight = referencePos?.height ?? 0;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        height: Math.max(blockHeight, 30),
      }}
    >
      <SideMenu {...props}>
        <DeleteBlockButton />
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <AddBlockButton {...(props as any)} />
        <AnyDragHandleButton dragHandleMenu={CustomDragHandleMenu} />
      </SideMenu>
    </div>
  );
}

export function CustomSideMenuController() {
  return <SideMenuController sideMenu={CustomSideMenu} />;
}
