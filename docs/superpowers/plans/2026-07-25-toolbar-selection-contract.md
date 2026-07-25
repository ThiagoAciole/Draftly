# Plano de implementação: toolbar com contrato de seleção

> **Para agentes executores:** SUB-SKILL OBRIGATÓRIO: usar superpowers:executing-plans para implementar este plano tarefa por tarefa. As etapas usam caixas de seleção (`- [ ]`) para acompanhamento.

**Objetivo:** Padronizar a toolbar do Draftly para transformar blocos selecionados, inserir tabelas com tamanho escolhido e converter CSV/TSV explicitamente em tabela.

**Arquitetura:** A lógica pura de reconhecimento de tabelas ficará em `src/lib/`, testada sem DOM. `EditorToolbar.tsx` consumirá essa lógica para decidir entre converter uma seleção delimitada e inserir uma tabela nova. As transformações de bloco continuarão usando a API de blocos do BlockNote.

**Stack:** React 19, TypeScript, Vitest, BlockNote 0.51.

## Restrições globais

- Não alterar conteúdo selecionado ao inserir uma tabela nova.
- Converter em tabela somente texto com duas ou mais linhas, delimitador consistente e mesma quantidade de colunas.
- Aplicar tipos de bloco a todos os blocos selecionados.
- Não criar commit automaticamente.

---

### Tarefa 1: reconhecimento de texto tabular

**Arquivos:**
- Criar: `src/lib/tableConversion.ts`
- Criar: `src/lib/tableConversion.test.ts`

**Interfaces:**
- Produz: `parseDelimitedTable(text: string): string[][] | null`.

- [ ] Escrever teste para CSV e TSV válidos e texto comum inválido.
- [ ] Executar `npx vitest run src/lib/tableConversion.test.ts` e confirmar falha de módulo ausente.
- [ ] Implementar reconhecimento de delimitador, linhas e células.
- [ ] Executar o teste específico e confirmar aprovação.

### Tarefa 2: ações da toolbar por seleção

**Arquivos:**
- Modificar: `src/components/editor/EditorToolbar.tsx`
- Modificar: `src/components/editor/EditorToolbar.test.tsx`

**Interfaces:**
- Consome: `parseDelimitedTable(text: string): string[][] | null`.
- Produz: botões de parágrafo, títulos 1–6, divisor e inserção/conversão de tabela.

- [ ] Escrever testes para o contrato das ações puras adicionadas à toolbar.
- [ ] Executar os testes e confirmar falha do comportamento ausente.
- [ ] Adicionar menu de tamanho da tabela e conversão explícita quando a seleção é CSV/TSV válida.
- [ ] Adicionar parágrafo, títulos 4–6 e divisor como transformações de bloco.
- [ ] Executar os testes específicos e confirmar aprovação.

### Tarefa 3: validação integrada

**Arquivos:**
- Modificar: arquivos das tarefas 1 e 2 somente se a validação encontrar erro.

- [ ] Executar `npx tsc --noEmit`.
- [ ] Executar `npm test`.
- [ ] Executar `git diff --check`.
