const DELIMITERS = ["\t", ";", ","];

/**
 * Recognises a small, predictable CSV/TSV table pasted or selected in the
 * editor. Quoted CSV is deliberately out of scope: this keeps conversion
 * lossless for the plain-text data the editor can safely recognise.
 */
export function parseDelimitedTable(text: string): string[][] | null {
  const lines = text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) return null;

  for (const delimiter of DELIMITERS) {
    const rows = lines.map((line) => line.split(delimiter).map((cell) => cell.trim()));
    const columnCount = rows[0]?.length ?? 0;

    if (columnCount < 2 || !rows.every((row) => row.length === columnCount)) {
      continue;
    }

    return rows;
  }

  return null;
}
