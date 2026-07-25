import { GripHorizontal, GripVertical, Plus } from "lucide-react";
import {
  ExtendButton as BlockNoteExtendButton,
  TableHandle as BlockNoteTableHandle,
} from "@blocknote/react";
import type { ExtendButtonProps, TableHandleProps } from "@blocknote/react";
import type { MouseEvent } from "react";
import { useCallback, useState } from "react";
import { isPointerInTableCorner } from "./tableCornerActivation";

type TableHandleGripIconProps = Pick<TableHandleProps, "orientation">;

export function TableHandleGripIcon({
  orientation,
}: TableHandleGripIconProps) {
  const Icon = orientation === "row" ? GripHorizontal : GripVertical;

  return (
    <Icon
      aria-hidden="true"
      className="table-handle-grip"
      data-testid={`table-grip-${orientation}`}
      size={14}
      strokeWidth={1.8}
    />
  );
}

export function DraftlyTableHandle(props: TableHandleProps) {
  return (
    <BlockNoteTableHandle {...props}>
      <TableHandleGripIcon orientation={props.orientation} />
    </BlockNoteTableHandle>
  );
}

export function DraftlyExtendButton(props: ExtendButtonProps) {
  const [isCornerActive, setIsCornerActive] = useState(false);

  const handleMouseMove = useCallback(
    (event: MouseEvent<HTMLSpanElement>) => {
      const button = (event.target as HTMLElement).closest(".bn-extend-button");
      if (!button) return;

      setIsCornerActive(
        isPointerInTableCorner(
          props.orientation,
          { x: event.clientX, y: event.clientY },
          button.getBoundingClientRect(),
        ),
      );
    },
    [props.orientation],
  );

  return (
    <span
      className={`table-corner-extend${isCornerActive ? " is-corner-active" : ""}`}
      onMouseLeave={() => setIsCornerActive(false)}
      onMouseMove={handleMouseMove}
    >
      <BlockNoteExtendButton {...props}>
        <Plus aria-hidden="true" size={14} strokeWidth={1.8} />
      </BlockNoteExtendButton>
    </span>
  );
}
