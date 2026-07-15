export type DocumentLanguage = "markdown" | "plaintext" | "json" | "javascript" | "typescript" | "python" | "html";
export type EditorKind = "visual-markdown" | "plain-text" | "code";

export type DocumentLanguageDefinition = {
  id: DocumentLanguage;
  label: string;
  extensions: string[];
  editorKind: EditorKind;
  prettierParser?: "json" | "babel" | "typescript" | "html";
};

export const documentLanguages: DocumentLanguageDefinition[] = [
  { id: "markdown", label: "Markdown", extensions: ["md"], editorKind: "visual-markdown" },
  { id: "plaintext", label: "Texto", extensions: ["txt"], editorKind: "plain-text" },
  { id: "json", label: "JSON", extensions: ["json"], editorKind: "code", prettierParser: "json" },
  { id: "javascript", label: "JavaScript", extensions: ["js"], editorKind: "code", prettierParser: "babel" },
  { id: "typescript", label: "TypeScript", extensions: ["ts"], editorKind: "code", prettierParser: "typescript" },
  { id: "python", label: "Python", extensions: ["py"], editorKind: "code" },
  { id: "html", label: "HTML", extensions: ["html"], editorKind: "code", prettierParser: "html" },
];

export const supportedExtensions = documentLanguages.flatMap((language) => language.extensions);

export const supportedDocumentFilter = {
  name: "Arquivos suportados",
  extensions: supportedExtensions,
};

export function getFileExtension(path: string): string | null {
  const name = path.split(/[\\/]/).pop() ?? path;
  const extension = name.split(".").pop();
  return extension && extension !== name ? extension.toLowerCase() : null;
}

export function getLanguageForPath(path: string): DocumentLanguageDefinition {
  const extension = getFileExtension(path);
  return documentLanguages.find((language) => language.extensions.includes(extension ?? "")) ?? documentLanguages[0];
}

export function isSupportedDocumentPath(path: string): boolean {
  return supportedExtensions.includes(getFileExtension(path) ?? "");
}

export const documentFileFilters = documentLanguages.map((language) => ({
  name: language.label,
  extensions: language.extensions,
}));
