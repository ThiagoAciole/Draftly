# Decisions

## Decisoes existentes

### Tauri v2 como shell desktop

- Contexto: app precisa de filesystem, clipboard, watcher, instalador, menus e associacoes de arquivo.
- Motivo: permitir integracao nativa com frontend web.
- Resultado: frontend Svelte chama Rust via comandos Tauri.
- Arquivos relacionados: `src-tauri/src/lib.rs`, `src/lib/api/tauri.ts`, `src-tauri/tauri.conf.json`.

### Svelte 5 com stores baseadas em runes

- Contexto: estado de abas e preferencias e reativo.
- Motivo: seguir padrao moderno do Svelte usado no projeto.
- Resultado: stores em `*.svelte.ts` usam `$state` e componentes usam runes.
- Arquivos relacionados: `src/lib/stores/tabs.svelte.ts`, `src/lib/stores/settings.svelte.ts`.

### Filesystem no Rust

- Contexto: app desktop precisa ler, escrever, renomear, copiar e revelar arquivos.
- Motivo: nao identificado no codigo atual.
- Resultado: frontend usa `tauriCommands` para operacoes de arquivo.
- Arquivos relacionados: `src/lib/api/tauri.ts`, `src-tauri/src/lib.rs`.

### Preview em duas etapas

- Contexto: Markdown precisa de renderizacao base e enriquecimentos de UI.
- Motivo: nao identificado no codigo atual.
- Resultado: Rust renderiza Markdown base; frontend processa e sanitiza recursos ricos.
- Arquivos relacionados: `src-tauri/src/lib.rs`, `src/lib/features/preview/markdown.processor.ts`.

### Services testaveis para regras sensiveis

- Contexto: autosave, recovery, lifecycle e documento possuem riscos de regressao.
- Motivo: nao identificado no codigo atual.
- Resultado: varias regras ficam em `src/lib/services` com testes ao lado.
- Arquivos relacionados: `src/lib/services/*.ts`, `src/lib/services/*.test.ts`.

## Decisoes pendentes

### Reduzir responsabilidade de `LayoutView.svelte`

- Contexto: arquivo concentra orquestracao de muitos fluxos.
- Impacto: mudancas pequenas podem exigir navegar um arquivo grande.
- Sugestao: extrair apenas quando houver demanda concreta e teste cobrindo o fluxo.

### Formalizar design system

- Contexto: ha tokens e componentes proprios, mas nao ha pacote ou guia formal.
- Impacto: mudancas visuais podem ficar dispersas.
- Sugestao: registrar tokens e componentes base se a UI continuar crescendo.
