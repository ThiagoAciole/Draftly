# Plano de Melhoria de Arquitetura e Refatoração (Clean Code)

Este documento descreve as melhorias e propostas de refatoração para simplificar a complexidade de código, separar responsabilidades e garantir a estabilidade do Draftly.

---

## 1. Oportunidades de Refatoração (Clean Code)

### A. Desacoplamento do Markdown e HTML Processor
*   **Problema:** O arquivo [markdown.processor.ts](file:///c:/Projetos/Draftly/src/lib/features/preview/markdown.processor.ts) faz manipulação de DOM e injeção de classes ao mesmo tempo em que invoca dependências pesadas (`DOMPurify`, `hljs`, `katex`).
*   **Refatoração:** Isolar as funções auxiliares puras (como renderização de alerts, detecção de links e regex) da manipulação direta de DOM do navegador. Criar utilitários menores e testáveis.

### B. Simplificação do `LayoutView.svelte`
*   **Problema:** O componente `LayoutView.svelte` contém mais de 3.900 linhas de código e gerencia desde watchers, modais de salvamento, auto-save e manipulação de estado.
*   **Refatoração:** Mover lógicas isoladas e síncronas de negócio para seus respectivos services. Por exemplo, centralizar todo o controle de watch de arquivos e tratamento de grace-period de escrita em um serviço ou store do Svelte 5.

### C. Estruturação Reativa de Temas
*   **Problema:** A conversão de temas do VS Code e do Monaco Editor compartilha lógica redundante e manipulação direta de propriedades CSS globais.
*   **Refatoração:** Refatorar a store de temas e unificar o ciclo de sincronização de cor em um único Rune `$effect` reativo em `theme.ts`.

### D. Melhorias de Responsividade, Estrutura do Layout e UI
*   **Problemas Identificados:**
    1.  **Transições de Painel (Split View):** Ajustes de split Ratio muito pequenos (ex: < 15%) escondem os controles do editor/viewer de forma bruta em telas estreitas.
    2.  **Sidebar colapsável em telas de toque (Mobile/Tablets):** A sidebar e a listagem de abas ocupam espaço fixo e necessitam de breakpoints de mídia flexíveis.
    3.  **UI/Visual das Abas (TabList):** Falta de suavidade visual (micro-animações de entrada e saída) quando abas são criadas, reordenadas ou fechadas.
*   **Refatoração e Ajustes:**
    1.  Implementar breakpoints com CSS Container Queries ou Media Queries inteligentes no `view-layout.css` para recolher o editor/viewer em viewports menores que `600px` automaticamente.
    2.  Adicionar animações suaves de transição (`transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1)`) no colapso e expansão da sidebar e do sumário de conteúdos.
    3.  Melhorar o contraste da barra divisória azul no modo escuro.

---

## 2. Modificações Propostas

### [Componente: Preview]
#### [MODIFY] [markdown.processor.ts](file:///c:/Projetos/Draftly/src/lib/features/preview/markdown.processor.ts)
*   Extrair funções como `isYoutubeLink`, `getYoutubeId` e callouts converters para módulos limpos.

### [Componente: Layout & Watcher]
#### [MODIFY] [LayoutView.svelte](file:///c:/Projetos/Draftly/src/lib/LayoutView.svelte)
*   Desacoplar handlers de eventos e otimizar timers do autosave.

---

## 3. Plano de Verificação

### Testes Automatizados
- Executar a suíte completa com `npm test` para garantir regressão zero.
- Validar integridade e compilação das Views com `npm run check`.
