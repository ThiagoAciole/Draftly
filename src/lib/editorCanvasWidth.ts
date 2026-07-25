export const MIN_EDITOR_CANVAS_WIDTH = 560;

export function getResizedEditorCanvasWidth(
  currentWidth: number,
  dragDelta: number,
  side: "left" | "right",
  maximumWidth: number,
): number {
  const nextWidth = currentWidth + (side === "left" ? -dragDelta : dragDelta);
  return Math.min(Math.max(nextWidth, MIN_EDITOR_CANVAS_WIDTH), maximumWidth);
}
