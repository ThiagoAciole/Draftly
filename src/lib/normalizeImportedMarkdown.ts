const fencedCodeLine = /^\s*(`{3,}|~{3,})/;
const structuralLine = /^\s{0,3}(?:#{1,6}(?:\s|$)|[-+*]\s+|\d+[.)]\s+|>\s?|(?:[-*_]\s*){3,}$|\|| {4}|\t)/;

function isPlainProseLine(line: string) {
  return line.trim().length > 0 && !structuralLine.test(line);
}

/**
 * Converts consecutive lines of imported prose into Markdown paragraphs.
 * Markdown structures retain their original line layout.
 */
export function normalizeImportedMarkdown(markdown: string) {
  const lineEnding = markdown.includes("\r\n") ? "\r\n" : "\n";
  const lines = markdown.split(/\r?\n/);
  const normalized: string[] = [];
  let isInsideFencedCode = false;
  let previousLineWasPlainProse = false;

  for (const line of lines) {
    const isFence = fencedCodeLine.test(line);

    if (isFence) {
      normalized.push(line);
      isInsideFencedCode = !isInsideFencedCode;
      previousLineWasPlainProse = false;
      continue;
    }

    if (isInsideFencedCode) {
      normalized.push(line);
      previousLineWasPlainProse = false;
      continue;
    }

    const isPlainProse = isPlainProseLine(line);
    if (isPlainProse && previousLineWasPlainProse) {
      normalized.push("");
    }

    normalized.push(line);
    previousLineWasPlainProse = isPlainProse;
  }

  return normalized.join(lineEnding);
}
