# Plano de implementação: títulos recolhíveis na toolbar

> **Para agentes executores:** SUB-SKILL OBRIGATÓRIO: usar superpowers:executing-plans para implementar este plano tarefa por tarefa. As etapas usam caixas de seleção (`- [ ]`) para acompanhamento.

**Objetivo:** Manter H1, H2 e H3 visíveis e recolher H4, H5 e H6 atrás de um botão de seta na toolbar.

**Arquitetura:** `EditorToolbar` mantém um estado local booleano para a expansão. O mesmo `setHeading` existente continua responsável pela transformação dos blocos, sem nova API ou mudança no modelo do editor.

**Stack:** React 19, TypeScript, Vitest, Lucide React.

## Restrições globais

- H1, H2 e H3 permanecem sempre visíveis.
- O botão de expansão fica imediatamente após H3.
- H4, H5 e H6 só são renderizados quando a expansão está aberta.
- Não alterar o comportamento de transformação dos títulos.
- Não criar commit automaticamente.

---

### Tarefa 1: expansão visual e teste da toolbar

**Arquivos:**
- Modificar: `src/components/editor/EditorToolbar.tsx`
- Modificar: `src/components/editor/EditorToolbar.test.tsx`

**Interfaces:**
- Consome: `setHeading(level: 1 | 2 | 3 | 4 | 5 | 6): void` existente.
- Produz: botão `Mostrar mais títulos` / `Ocultar títulos adicionais` e renderização condicional de H4–H6.

- [ ] Escrever teste que confirma que H4 não aparece inicialmente e aparece após acionar a expansão.
- [ ] Executar `cmd /c npm test -- src/components/editor/EditorToolbar.test.tsx` e confirmar falha.
- [ ] Adicionar `showAdditionalHeadings`, um `ChevronDown` rotacionável e a renderização condicional de H4–H6.
- [ ] Executar o teste específico e confirmar aprovação.

### Tarefa 2: validação

**Arquivos:**
- Modificar somente os arquivos da Tarefa 1 se a validação detectar falha.

- [ ] Executar `cmd /c npm exec tsc -- --noEmit`.
- [ ] Executar `cmd /c npm test`.
- [ ] Executar `git diff --check`.
