export function isYoutubeLink(url: string): boolean {
  return url.includes("youtube.com/watch") || url.includes("youtu.be/");
}

export function getYoutubeId(url: string): string | null {
  const match = url.match(
    /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/,
  );
  return match && match[2].length === 11 ? match[2] : null;
}

export function findDisplayMathEnd(text: string, start: number): number {
  for (let index = start; index < text.length - 1; index += 1) {
    if (
      text[index] === "$" &&
      text[index + 1] === "$" &&
      text[index - 1] !== "\\"
    ) {
      return index;
    }
  }
  return -1;
}

export function findInlineMathEnd(text: string, start: number): number {
  for (let index = start; index < text.length; index += 1) {
    if (text[index] !== "$") continue;
    if (text[index - 1] === "\\") continue;

    const beforeEnd = text[index - 1] || "";
    const afterEnd = text[index + 1] || "";
    if (/\s/.test(beforeEnd) || /\d/.test(afterEnd)) return -1;

    return index;
  }
  return -1;
}

export function convertInlineMathDelimiters(text: string): string {
  const parts: string[] = [];
  let index = 0;
  let previousDollarAllowsInlineOpen = false;

  while (index < text.length) {
    const char = text[index];
    if (char !== "$") {
      parts.push(char);
      previousDollarAllowsInlineOpen = false;
      index += 1;
      continue;
    }

    if (text[index - 1] !== "\\" && text[index + 1] === "$") {
      const displayEnd = findDisplayMathEnd(text, index + 2);
      if (displayEnd !== -1) {
        parts.push(text.slice(index, displayEnd + 2));
        previousDollarAllowsInlineOpen = true;
        index = displayEnd + 2;
        continue;
      }

      parts.push("$$");
      previousDollarAllowsInlineOpen = false;
      index += 2;
      continue;
    }

    if (
      text[index - 1] === "\\" ||
      (text[index - 1] === "$" && !previousDollarAllowsInlineOpen) ||
      /\s/.test(text[index + 1] || "")
    ) {
      parts.push(char);
      previousDollarAllowsInlineOpen = false;
      index += 1;
      continue;
    }

    const end = findInlineMathEnd(text, index + 1);
    if (end === -1) {
      parts.push(char);
      previousDollarAllowsInlineOpen = false;
      index += 1;
      continue;
    }

    parts.push(`\\(${text.slice(index + 1, end)}\\)`);
    index = end + 1;
    previousDollarAllowsInlineOpen = true;
  }

  return parts.join("");
}
