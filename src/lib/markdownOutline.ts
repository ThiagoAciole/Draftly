export type MarkdownHeading = {
  level: number;
  text: string;
  line: number;
};

export function getMarkdownHeadings(markdown: string): MarkdownHeading[] {
  let isInsideCodeFence = false;

  return markdown.split(/\r?\n/).flatMap((line, index) => {
    if (/^\s*(```|~~~)/.test(line)) {
      isInsideCodeFence = !isInsideCodeFence;
      return [];
    }
    if (isInsideCodeFence) return [];

    const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) return [];

    return [{ level: match[1].length, text: match[2].trim(), line: index }];
  });
}
