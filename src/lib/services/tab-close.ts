export async function closeTabsSafely(
  tabIds: string[],
  canClose: (tabId: string) => Promise<boolean>,
  close: (tabId: string) => void,
): Promise<boolean> {
  for (const tabId of tabIds) {
    if (!(await canClose(tabId))) return false;
  }

  for (const tabId of tabIds) {
    close(tabId);
  }

  return true;
}
