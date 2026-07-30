# Plano de implementação: responsividade do editor

> **Para agentes executores:** SUB-SKILL OBRIGATÓRIO: usar superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para implementar este plano tarefa por tarefa. As etapas usam caixas de seleção (`- [ ]`) para acompanhamento.

**Objetivo:** Ajustar toolbar, canvas e titlebar do Draftly para redimensionamento entre 360px e 1200px.

**Arquitetura:** Mudança localizada em CSS. A toolbar continuará usando a estrutura React existente; o layout será controlado por Flexbox, `min-width: 0`, rolagem horizontal e breakpoints progressivos.

**Stack:** React, TypeScript, Vite, CSS customizado, Vitest.

## Restrições globais

- Não alterar estado, contextos, backend Rust ou operações de arquivo.
- Não adicionar dependências.
- Não executar build de produção.
- Preservar o comportamento atual em janelas largas.
- Validar com `npx tsc --noEmit` e inspeção visual nas larguras definidas.

---

### Tarefa 1: estabilizar toolbar e seletor de modo

**Arquivos:**
- Modificar: `src/styles/editor.css`, regras `.editor-toolbar-row`, `.editor-toolbar-row > .editor-mode-switch` e `.editor-toolbar-row > .editor-toolbar`.

- [ ] **Etapa 1: aplicar layout flexível**

Alterar a composição para que a toolbar ocupe o espaço disponível, o seletor não dependa de posicionamento absoluto e o espaçamento seja progressivo:

```css
.editor-toolbar-row {
  gap: clamp(8px, 3vw, 32px);
}

.editor-toolbar-row > .editor-mode-switch {
  position: static;
  flex: 0 0 auto;
}

.editor-toolbar-row > .editor-toolbar {
  width: auto;
  min-width: 0;
  flex: 1 1 auto;
}
```

- [ ] **Etapa 2: validar tipos**

Executar `npx tsc --noEmit`. Esperado: saída sem erros.

### Tarefa 2: criar faixa intermediária de responsividade

**Arquivos:**
- Modificar: `src/styles/editor.css`.

- [ ] **Etapa 1: adicionar breakpoint de 1000px**

Adicionar antes do breakpoint de 760px:

```css
@media (max-width: 1000px) {
  .editor-toolbar-row {
    width: calc(100% - 32px);
    max-width: none;
    gap: 16px;
  }

  .editor-canvas-resizer {
    display: none;
  }

  .editor-scroll {
    padding-inline: 24px;
  }
}
```

- [ ] **Etapa 2: validar tipos**

Executar `npx tsc --noEmit`. Esperado: saída sem erros.

### Tarefa 3: alinhar faixa estreita e evitar margens duplicadas

**Arquivos:**
- Modificar: `src/styles/editor.css`.

- [ ] **Etapa 1: ajustar regras existentes de 760px**

Dentro do breakpoint atual, substituir a margem fixa da toolbar e manter a rolagem interna:

```css
@media (max-width: 760px) {
  .editor-toolbar-row {
    width: calc(100% - 24px);
    gap: 8px;
  }

  .editor-toolbar-row > .editor-toolbar {
    flex: 1 1 auto;
    width: auto;
    margin: 0;
  }

  .editor-toolbar {
    min-width: 0;
  }
}
```

- [ ] **Etapa 2: validar tipos e diff**

Executar `npx tsc --noEmit` e `git diff --check`. Esperado: ambos sem erros.

### Tarefa 4: validação visual final

**Arquivos:**
- Nenhum arquivo adicional.

- [ ] **Etapa 1: validar larguras do vídeo**

Inspecionar o editor em `1200x800`, `1000x700`, `860x560`, `760x560`, `640x560`, `500x560` e `360x560`.

- [ ] **Etapa 2: confirmar critérios**

Confirmar que não há sobreposição, corte horizontal, toolbar inacessível ou colisão entre abas e controles.
