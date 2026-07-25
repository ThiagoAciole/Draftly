export function replaceLiteralMatch(content: string, query: string, replacement: string, matchIndex: number) {
  if (!query || matchIndex < 0) return { content, replaced: false };

  const pattern = new RegExp(escapeRegExp(query), "gi");
  const matches = [...content.matchAll(pattern)];
  const target = matches[matchIndex];
  if (!target || target.index === undefined) return { content, replaced: false };

  return {
    content: `${content.slice(0, target.index)}${replacement}${content.slice(target.index + target[0].length)}`,
    replaced: true,
  };
}

export function replaceLiteralMatches(content: string, query: string, replacement: string) {
  if (!query) return { content, count: 0 };

  let count = 0;
  const nextContent = content.replace(new RegExp(escapeRegExp(query), "gi"), () => {
    count += 1;
    return replacement;
  });

  return { content: nextContent, count };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
