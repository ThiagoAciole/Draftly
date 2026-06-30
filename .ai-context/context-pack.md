# Context Pack

## Resumo rapido

Draftly e um app desktop Tauri para abrir, editar, visualizar, salvar e exportar Markdown, texto, JSON, HTML e arquivos de codigo comuns. O frontend em Svelte orquestra abas, editor Monaco, preview, autosave, recuperacao, temas e UI. O backend Rust concentra filesystem, renderizacao Markdown, watcher, clipboard, instalador Windows, temas VS Code e integracoes nativas.

## Stack

- Svelte 5 com runes, SvelteKit SPA, TypeScript estrito e Vite.
- Tauri v2 + Rust.
- Monaco Editor.
- Comrak no Rust para Markdown base.
- DOMPurify, Highlight.js, KaTeX e Mermaid no frontend para preview rico.
- Vitest com JSDOM para testes frontend.

## Arquitetura

- `src/routes/+page.svelte` carrega `LayoutView`.
- `src/lib/LayoutView.svelte` e o orquestrador principal: janela, abas, arquivos, comandos, preview, modais, shortcuts, autosave e renderizacao.
- `src/lib/views/` separa layouts por tipo: Markdown, HTML, texto e JSON.
- `src/lib/components/` contem UI reutilizavel e componentes de fluxo.
- `src/lib/services/` contem regras testaveis de documentos, autosave, recovery, lifecycle, recentes, watcher e atalhos.
- `src/lib/features/preview/` concentra pos-processamento de Markdown/HTML.
- `src/lib/features/files/` define tipos, extensoes, linguagem e icones.
- `src/lib/api/tauri.ts` e o contrato tipado com comandos Rust.
- `src-tauri/src/lib.rs` registra comandos, plugins, menu nativo e janelas.
- `src-tauri/src/setup.rs` cuida de instalacao/desinstalacao Windows.

## Features principais

- Abas com historico, restauracao de sessao, scroll e estado do Monaco.
- Editor Monaco com toolbar Markdown, status bar, atalhos, validacao JSON, paste de imagens e drag-and-drop.
- Preview Markdown com callouts, tasks, folding de secoes, block IDs, matematica, Mermaid, YouTube, midia local e sanitizacao.
- Views para Markdown, HTML, texto e JSON.
- Autosave com debounce, conflitos por alteracao externa e recovery local.
- Temas claro/escuro, importacao de temas VS Code e preferencias persistidas.
- Exportacao HTML/PDF via modal de preview.
- Instalador/desinstalador Windows com atalhos, registro e associacoes de arquivo.

## Padroes importantes

- Use Svelte 5: `$state`, `$derived`, `$effect`, `$props`, `$bindable`.
- Use stores `*.svelte.ts` para estado reativo global.
- Chame Rust pelo wrapper `tauriCommands`; nao use `invoke()` espalhado no frontend.
- Filesystem deve ficar no Rust ou em comandos Tauri tipados.
- HTML de preview deve passar por DOMPurify.
- Services devem ser puros/testaveis quando possivel.
- Mudancas visuais devem respeitar `src/styles.css`, `view-layout.css` e variaveis CSS existentes.

## Como trabalhar neste projeto

1. Localize a area pelo mapa de arquivos antes de abrir componentes grandes.
2. Mude o menor conjunto de arquivos possivel.
3. Preserve stores, services e wrappers existentes.
4. Ao criar comando Tauri, adicione wrapper em `src/lib/api/tauri.ts`, implemente Rust e registre no `generate_handler!`.
5. Atualize testes quando mexer em services, stores, preview, file-types ou regras de documento.
6. Rode ao menos `npm run check` e testes relevantes; para Rust, rode `cargo check` em `src-tauri` quando alterar backend.

## O que evitar

- Refatorar `LayoutView.svelte` fora do escopo da tarefa.
- Criar acesso Node/filesystem no frontend.
- Remover sanitizacao, recovery, autosave ou protecoes contra conflito sem substituto.
- Editar `build/`, `.svelte-kit/`, `node_modules/`, `src-tauri/target/` ou `src-tauri/gen/`.
- Introduzir dependencia nova sem necessidade clara.

## Arquivos importantes

- `src/lib/LayoutView.svelte`: fluxo principal do app.
- `src/lib/components/Editor.svelte`: Monaco, shortcuts, toolbar, clipboard, imagens e JSON.
- `src/lib/stores/tabs.svelte.ts`: abas, historico, split e estado de editor.
- `src/lib/stores/settings.svelte.ts`: preferencias persistidas.
- `src/lib/features/preview/markdown.processor.ts`: preview rico e pos-processamento.
- `src/lib/features/files/file-types.ts`: extensoes, linguagens e icones.
- `src/lib/api/tauri.ts`: contrato frontend/Rust.
- `src-tauri/src/lib.rs`: comandos, renderizacao, watcher, menu e bootstrap Tauri.
- `src-tauri/src/setup.rs`: instalador/desinstalador Windows.

## Prompt curto para IA

Voce esta trabalhando no Draftly. Antes de alterar qualquer coisa, leia `.ai-context/context-pack.md`, `.ai-context/architecture.md`, `.ai-context/code-patterns.md`, `.ai-context/current-state.md` e o arquivo exato da area que sera modificada. Preserve os padroes existentes, mantenha filesystem no Rust, use `tauriCommands` no frontend, nao refatore fora do escopo e atualize `.ai-context/` quando mudar arquitetura, features, APIs, estado, regras de negocio ou decisoes tecnicas.
