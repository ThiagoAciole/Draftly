export type RecoverableDraft = {
  id: string;
  path: string | null;
  name: string;
  markdown: string;
  savedMarkdown: string;
};

type DraftCandidate = RecoverableDraft;

export function getRecoverableDrafts(tabs: DraftCandidate[]): RecoverableDraft[] {
  return tabs
    .filter((tab) => tab.markdown !== tab.savedMarkdown)
    .map(({ id, path, name, markdown, savedMarkdown }) => ({ id, path, name, markdown, savedMarkdown }));
}
