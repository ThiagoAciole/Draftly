import { marked } from "marked";

export function markdownToPlainText(markdown: string) {
  const document = new DOMParser().parseFromString(
    marked.parse(markdown) as string,
    "text/html",
  );
  if (typeof document.body.innerText === "string") {
    return document.body.innerText.trimEnd();
  }

  return Array.from(document.body.children)
    .map((element) => element.textContent?.trim())
    .filter((text): text is string => Boolean(text))
    .join("\n\n");
}

export async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand("copy");
  textArea.remove();
}
