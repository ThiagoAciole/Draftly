import type { DocumentLanguage } from "./languages";
import { documentLanguages } from "./languages";

export async function formatDocumentContent(content: string, language: DocumentLanguage): Promise<string> {
  const parser = documentLanguages.find((definition) => definition.id === language)?.prettierParser;
  if (!parser) return content;

  const [{ format }, babel, estree, html, typescript] = await Promise.all([
    import("prettier/standalone"),
    import("prettier/plugins/babel"),
    import("prettier/plugins/estree"),
    import("prettier/plugins/html"),
    import("prettier/plugins/typescript"),
  ]);

  return format(content, { parser, plugins: [babel, estree, html, typescript] });
}
