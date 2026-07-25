# Plano de implementação: assistente de escrita Gemini

> **Para agentes executores:** SUB-SKILL OBRIGATÓRIO: usar superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para implementar este plano tarefa por tarefa. As etapas usam caixas de seleção (`- [ ]`) para acompanhamento.

**Objetivo:** integrar o Gemini como assistência de escrita opcional e controlada no editor Markdown do Draftly.

**Arquitetura:** um domínio de IA no frontend tipa ações, prompts e estados; o comando Tauri guarda a chave no cofre do Windows e chama a Gemini. O editor exibe apenas sugestões e prévias que exigem confirmação explícita.

**Stack:** React 19, TypeScript, Vitest, BlockNote, Radix UI, Tauri v2, Rust, `reqwest` e `keyring`.

## Restrições globais

- Nenhuma ação de IA pode alterar documento sem `Tab`, clique ou botão explícito de aplicar.
- Prompts preservam fatos, links, imagens, blocos de código e frontmatter.
- A chave da Gemini não pode ir para `settings.json` ou para o bundle React.
- O fluxo de código e `Ctrl+Shift+I` permanecem inalterados.
- `.txt` abre no editor visual Markdown preservando as quebras de linha e deixa de aparecer em Novo arquivo.
- Não criar chat, histórico, provedor alternativo, busca web ou IA para arquivos de código neste MVP.

---

### Tarefa 1: domínio Gemini tipado e testado

**Arquivos:**
- Criar: `src/lib/ai/types.ts`, `src/lib/ai/prompts.ts`, `src/lib/ai/response.ts`
- Criar: `src/lib/ai/prompts.test.ts`, `src/lib/ai/response.test.ts`

**Interfaces:**
- Produz `AiAction`, `AiResult`, `buildAiPrompt(action, content)` e `parseAiResponse(action, text)`.

- [ ] Escrever testes que exijam Markdown puro para `format`, preservação de conteúdo em `correct` e lista de sugestões em `improve`.
- [ ] Executar `cmd /c npm test -- src/lib/ai` e confirmar falha por módulos inexistentes.
- [ ] Implementar tipos, prompts curtos em pt-BR e parser que rejeita resposta vazia/inválida.
- [ ] Executar `cmd /c npm test -- src/lib/ai` e confirmar aprovação.

### Tarefa 2: chave protegida e chamada Gemini no Tauri

**Arquivos:**
- Modificar: `src-tauri/Cargo.toml`, `src-tauri/src/lib.rs`
- Criar: `src/lib/ai/client.ts`
- Criar: `src/lib/ai/client.test.ts`

**Interfaces:**
- Consome `AiAction`, `buildAiPrompt` e `parseAiResponse`.
- Produz comandos `save_gemini_api_key`, `has_gemini_api_key`, `delete_gemini_api_key` e `run_gemini_action`.

- [ ] Escrever testes unitários para conversão de resposta Gemini e mapeamento de erros sem expor chave.
- [ ] Executar `cmd /c npm test -- src/lib/ai/client.test.ts` e confirmar falha.
- [ ] Adicionar dependências Rust, armazenar a chave via keyring e chamar `generateContent` com timeout, usando `gemini-2.5-flash-lite` como padrão configurável.
- [ ] Expor wrappers no único ponto de IPC `src/lib/ai/client.ts`.
- [ ] Rodar `cargo test` em `src-tauri` e `cmd /c npm test -- src/lib/ai`.

### Tarefa 3: contexto, configurações e disponibilidade

**Arquivos:**
- Criar: `src/contexts/AiContext.tsx`, `src/contexts/AiContext.test.tsx`
- Modificar: `src/app/App.tsx`, `src/contexts/index.ts`, `src/contexts/SettingsContext.tsx`, `src/components/settings/SettingsModal.tsx`, `src/styles/settings.css`

**Interfaces:**
- Produz `useAi()` com `isConfigured`, `isLoading`, `error`, `runAction`, `saveApiKey` e `removeApiKey`.

- [ ] Escrever teste que exija indisponibilidade sem chave e atualização após salvar uma chave mockada.
- [ ] Executar teste e confirmar falha.
- [ ] Implementar contexto e seção IA nas configurações, incluindo ativação, modelo, campo de chave e remoção.
- [ ] Executar teste do contexto e teste completo do frontend.

### Tarefa 4: menu de IA e prévia de operações explícitas

**Arquivos:**
- Criar: `src/components/ai/AiPreviewDialog.tsx`, `src/components/ai/MarkdownAiMenu.tsx`
- Criar: `src/components/ai/AiPreviewDialog.test.tsx`
- Modificar: `src/components/layout/TitleBar.tsx`, `src/contexts/FileActionsContext.tsx`, `src/styles/titlebar.css`

**Interfaces:**
- Consome `useAi()` e `updateActiveMarkdown`.
- Produz dropdown `Formatar com IA`, `Corrigir com IA` e `Sugerir melhorias` para documentos Markdown.

- [ ] Escrever teste de que a prévia não muda o documento até `Substituir documento`.
- [ ] Executar e confirmar falha.
- [ ] Trocar a ação direta `formatMarkdownDocument` pelo dropdown e implementar prévia, copiar e descarte.
- [ ] Executar teste do diálogo e suíte completa.

### Tarefa 5: seleção, sugestões durante escrita e retirada do editor TXT

**Arquivos:**
- Criar: `src/components/ai/AiSelectionMenu.tsx`, `src/components/ai/InlineAiSuggestion.tsx`
- Criar: `src/lib/ai/inlineSuggestion.ts`, `src/lib/ai/inlineSuggestion.test.ts`
- Modificar: `src/components/editor/MarkdownEditor.tsx`, `src/components/ui/NewDocumentDropdown.tsx`, `src/lib/languages.ts`, `src/components/layout/AppShell.tsx`, `src/contexts/FileActionsContext.tsx`
- Remover: `src/components/editor/PlainTextEditor.tsx`, `src/components/editor/PlainTextEditor.test.tsx`

**Interfaces:**
- Consome `useAi()`, `AiAction` e `normalizeInlineSuggestion`.
- Produz sugestão aceitável por `Tab`/clique e menu flutuante para seleção.

- [ ] Escrever testes de aceitação por Tab, descarte ao digitar e preservação de quebras de linha de TXT.
- [ ] Executar os testes e confirmar falha.
- [ ] Implementar debounce por parágrafo, cancelamento de solicitação antiga, menu de seleção e abertura de TXT no editor visual.
- [ ] Remover a opção de criar TXT e o editor exclusivo.
- [ ] Executar os testes novos e a suíte completa.

### Tarefa 6: verificação final

**Arquivos:**
- Modificar: testes afetados pelas alterações anteriores.

- [ ] Executar `cmd /c npm test`.
- [ ] Executar `cmd /c npm exec tsc -- --noEmit`.
- [ ] Executar `cargo test` em `src-tauri`.
- [ ] Executar `git diff --check` e revisar `git status --short` para garantir que somente arquivos do escopo foram alterados.
