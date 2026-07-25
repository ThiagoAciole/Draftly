export type ExtendButtonOrientation =
  | "addOrRemoveRows"
  | "addOrRemoveColumns";

type PointerPosition = { x: number; y: number };
type Bounds = Pick<DOMRect, "right" | "bottom">;

const CORNER_ACTIVATION_SIZE = 28;

export function isPointerInTableCorner(
  orientation: ExtendButtonOrientation,
  pointer: PointerPosition,
  bounds: Bounds,
) {
  return orientation === "addOrRemoveRows"
    ? pointer.x >= bounds.right - CORNER_ACTIVATION_SIZE
    : pointer.y >= bounds.bottom - CORNER_ACTIVATION_SIZE;
}
