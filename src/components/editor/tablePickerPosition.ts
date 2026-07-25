const PICKER_WIDTH = 336;
const VIEWPORT_GUTTER = 8;
const VERTICAL_GAP = 8;

type TableButtonRect = Pick<DOMRect, "bottom" | "left" | "width">;

export function getTablePickerPosition(
  buttonRect: TableButtonRect,
  viewportWidth: number,
) {
  const preferredLeft =
    buttonRect.left + buttonRect.width / 2 - PICKER_WIDTH / 2;
  const maxLeft = Math.max(VIEWPORT_GUTTER, viewportWidth - PICKER_WIDTH - VIEWPORT_GUTTER);

  return {
    left: Math.min(Math.max(VIEWPORT_GUTTER, preferredLeft), maxLeft),
    top: buttonRect.bottom + VERTICAL_GAP,
  };
}
