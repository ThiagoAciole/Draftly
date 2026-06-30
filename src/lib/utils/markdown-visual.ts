import TurndownService from "turndown";

export function prepareVisualEditorHtml(html: string) {
  if (!html.trim() || typeof DOMParser === "undefined") return html;

  const doc = new DOMParser().parseFromString(html, "text/html");

  doc
    .querySelectorAll(
      ".copy-code-btn, .fold-toggle, .block-id-anchor, .draftly-find-match",
    )
    .forEach((node) => node.remove());

  doc.querySelectorAll("input[data-task-checkbox]").forEach((input) => {
    const li = input.closest("li");
    const ul = li?.closest("ul");
    if (!li || !ul) return;

    ul.setAttribute("data-type", "taskList");
    li.setAttribute("data-type", "taskItem");
    li.setAttribute(
      "data-checked",
      input.getAttribute("checked") !== null ? "true" : "false",
    );
    input.remove();
  });

  doc.querySelectorAll("[data-sourcepos]").forEach((node) => {
    node.removeAttribute("data-sourcepos");
  });

  return doc.body.innerHTML;
}

export function visualHtmlToMarkdown(html: string) {
  const turndown = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
  });

  turndown.addRule("taskItems", {
    filter: (node) =>
      node.nodeName === "LI" &&
      (node as Element).getAttribute("data-type") === "taskItem",
    replacement: (content, node) => {
      const checked =
        (node as Element).getAttribute("data-checked") === "true" ? "x" : " ";
      return `- [${checked}] ${content.trim()}\n`;
    },
  });

  turndown.addRule("strikethrough", {
    filter: ["s", "del"],
    replacement: (content) => `~~${content}~~`,
  });

  return turndown
    .turndown(html)
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
}
