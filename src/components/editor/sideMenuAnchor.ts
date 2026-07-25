export function getBlockElement(blockId: string, root: ParentNode) {
  return (
    Array.from(root.querySelectorAll<HTMLElement>(".bn-block[data-id]")).find(
      (block) => block.dataset.id === blockId,
    ) ?? null
  );
}

function getFirstLineRect(inlineContent: HTMLElement) {
  const range = document.createRange();

  try {
    range.selectNodeContents(inlineContent);
    return range.getClientRects().item(0);
  } finally {
    range.detach();
  }
}

export function getSideMenuAnchorRect(blockElement: HTMLElement) {
  const content = blockElement.querySelector<HTMLElement>(".bn-block-content");
  if (!content) return blockElement.getBoundingClientRect();

  const inlineContent = content.querySelector<HTMLElement>(".bn-inline-content");
  const firstLine = inlineContent ? getFirstLineRect(inlineContent) : null;

  return firstLine ?? content.getBoundingClientRect();
}
