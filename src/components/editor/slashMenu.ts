import type { BlockNoteEditor } from "@blocknote/core";
import type { DefaultReactSuggestionItem } from "@blocknote/react";
import { getDefaultReactSlashMenuItems } from "@blocknote/react";

const ITEMS_TO_REMOVE = new Set(["Video", "Audio", "File"]);

const GROUP_TRANSLATIONS: Record<string, string> = {
  Headings: "Cabeçalho",
  "Basic blocks": "Bloco Básico",
  Advanced: "Avançado",
  Media: "Mídia",
  Others: "Outros",
};

const ITEM_TRANSLATIONS: Record<string, { title: string; subtext: string }> = {
  "Heading 1": { title: "Título 1", subtext: "##### Lorem Ipsum is simply ..." },
  "Heading 2": { title: "Título 2", subtext: "##### Lorem Ipsum is simply ..." },
  "Heading 3": { title: "Título 3", subtext: "##### Lorem Ipsum is simply ..." },
  "Heading 4": { title: "Título 4", subtext: "#### Lorem Ipsum is simply ..." },
  "Heading 5": { title: "Título 5", subtext: "##### Lorem Ipsum is simply ..." },
  "Heading 6": { title: "Título 6", subtext: "###### Lorem Ipsum is simply ..." },
  Quote: { title: "Citação", subtext: "> Lorem Ipsum is simply ..." },
  "Numbered List": { title: "Lista Numerada", subtext: "1. Lorem Ipsum is simply ..." },
  "Bullet List": { title: "Lista com Marcadores", subtext: "- Lorem Ipsum is simply ..." },
  "Check List": { title: "Lista de Tarefas", subtext: "[ ] Lorem Ipsum is simply ..." },
  Paragraph: { title: "Parágrafo", subtext: "Lorem Ipsum is simply ..." },
  "Code Block": { title: "Bloco de Código", subtext: "```Lorem Ipsum is simply```" },
  "Page Break": { title: "Separador", subtext: "---" },
  Divider: { title: "Divisor", subtext: "---" },
  Table: { title: "Tabela", subtext: "| Lorem | Ipsum is simply |" },
  Image: { title: "Imagem", subtext: "![Lorem Ipsum](url)" },
  Emoji: { title: "Emoji", subtext: ":emoji:" },
};

export function getSlashMenuItems(
  editor: BlockNoteEditor,
): DefaultReactSuggestionItem[] {
  return getDefaultReactSlashMenuItems(editor)
    .filter((item) => !ITEMS_TO_REMOVE.has(item.title))
    .map((item) => {
      const translation = ITEM_TRANSLATIONS[item.title];
      const groupTranslation = item.group ? GROUP_TRANSLATIONS[item.group] : undefined;
      return {
        ...item,
        ...(translation ? { title: translation.title, subtext: translation.subtext } : {}),
        ...(groupTranslation ? { group: groupTranslation } : {}),
      };
    });
}
