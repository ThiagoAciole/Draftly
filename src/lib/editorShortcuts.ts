type ShortcutEvent = Pick<
  KeyboardEvent,
  "altKey" | "ctrlKey" | "key" | "metaKey" | "preventDefault"
> & {
  shiftKey?: boolean;
};

export function handleSaveShortcut(
  event: ShortcutEvent,
  save: () => void,
): boolean {
  const isSave =
    (event.ctrlKey || event.metaKey) &&
    !event.altKey &&
    !event.shiftKey &&
    event.key.toLowerCase() === "s";

  if (!isSave) return false;

  event.preventDefault();
  save();
  return true;
}

export function handleSelectAllShortcut(
  event: ShortcutEvent,
  selectAll: () => void,
): boolean {
  const isSelectAll =
    (event.ctrlKey || event.metaKey) &&
    !event.altKey &&
    event.key.toLowerCase() === "a";

  if (!isSelectAll) return false;

  event.preventDefault();
  selectAll();
  return true;
}
