function isStructuredLine(line: string): boolean {
  return /^(#{1,6}\s|[-*+]\s|\d+[.)]\s|>\s|```|~~~|\|.*\|$|---+$|\*\*\*+$)/.test(line);
}

function getDelimiter(line: string): "," | ";" | "\t" | null {
  const candidates: Array<"," | ";" | "\t"> = ["\t", ";", ","];
  return candidates.find((delimiter) => line.split(delimiter).length >= 2) ?? null;
}

function readDelimitedTable(lines: string[], start: number): { markdown: string; end: number } | null {
  const delimiter = getDelimiter(lines[start]);
  if (!delimiter) return null;

  const rows: string[][] = [];
  let end = start;
  while (end < lines.length && lines[end].trim()) {
    if (getDelimiter(lines[end]) !== delimiter) break;
    rows.push(lines[end].split(delimiter).map((cell) => cell.trim()));
    end += 1;
  }

  if (rows.length < 2 || rows.some((row) => row.length !== rows[0].length)) return null;

  const toRow = (row: string[]) => `| ${row.map((cell) => cell.replace(/\|/g, "\\|")).join(" | ")} |`;
  return {
    markdown: [toRow(rows[0]), `| ${rows[0].map(() => "---").join(" | ")} |`, ...rows.slice(1).map(toRow)].join("\n"),
    end,
  };
}

function isTitleCandidate(line: string): boolean {
  return line.length > 0 && line.length <= 80 && !/[.!?:;]$/.test(line) && !isStructuredLine(line) && !getDelimiter(line);
}

export function formatPlainTextAsMarkdown(content: string): string {
  const lines = content.replace(/\r\n?/g, "\n").split("\n").map((line) => line.trimEnd());
  const firstContentLine = lines.findIndex((line) => line.trim().length > 0);
  const blocks: string[] = [];
  let index = 0;

  if (firstContentLine >= 0 && isTitleCandidate(lines[firstContentLine].trim()) && lines.slice(firstContentLine + 1).some((line) => line.trim())) {
    blocks.push(`# ${lines[firstContentLine].trim()}`);
    index = firstContentLine + 1;
  }

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) {
      index += 1;
      continue;
    }

    if (/^(```|~~~)/.test(line)) {
      const fence = line.slice(0, 3);
      const codeLines = [lines[index]];
      index += 1;
      while (index < lines.length) {
        codeLines.push(lines[index]);
        if (lines[index].trim().startsWith(fence)) {
          index += 1;
          break;
        }
        index += 1;
      }
      blocks.push(codeLines.join("\n"));
      continue;
    }

    const table = readDelimitedTable(lines, index);
    if (table) {
      blocks.push(table.markdown);
      index = table.end;
      continue;
    }

    if (isStructuredLine(line)) {
      blocks.push(lines[index]);
      index += 1;
      continue;
    }

    const paragraph: string[] = [];
    while (index < lines.length) {
      const candidate = lines[index].trim();
      if (!candidate || isStructuredLine(candidate) || readDelimitedTable(lines, index)) break;
      paragraph.push(candidate);
      index += 1;
    }
    if (paragraph.length > 0) blocks.push(paragraph.join(" "));
  }

  return blocks.join("\n\n").trim();
}
