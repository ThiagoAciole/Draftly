export type TextDiff = {
  before: string;
  removed: string;
  added: string;
  after: string;
};

export function getTextDiff(original: string, next: string): TextDiff {
  let start = 0;
  const sharedEnd = Math.min(original.length, next.length);
  while (start < sharedEnd && original[start] === next[start]) start += 1;

  let originalEnd = original.length;
  let nextEnd = next.length;
  while (
    originalEnd > start &&
    nextEnd > start &&
    original[originalEnd - 1] === next[nextEnd - 1]
  ) {
    originalEnd -= 1;
    nextEnd -= 1;
  }

  return {
    before: original.slice(0, start),
    removed: original.slice(start, originalEnd),
    added: next.slice(start, nextEnd),
    after: original.slice(originalEnd),
  };
}
