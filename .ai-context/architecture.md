# Architecture

## Visao geral

A arquitetura combina SPA Svelte no frontend com backend Rust/Tauri para operacoes nativas. O frontend controla experiencia, estado e renderizacao; o Rust executa filesystem, Markdown base, watcher, clipboard, temas salvos, instalador e menu nativo.

## Camadas principais

- Rota: `src/routes/+page.svelte` importa estilos globais e monta `LayoutView`.
- Shell do app: `LayoutView.svelte` integra estado, comandos, dialogs, views e lifecycle.
- Views: `MarkdownView`, `HtmlView`, `TextView` e `JsonView` renderizam layouts por tipo.
- Componentes: editor, titulo, abas, settings, dialogs, find, TOC, export preview, zen notes e home.
- Stores: `tabs.svelte.ts` e `settings.svelte.ts`.
- Services: regras de documento, autosave, recovery, lifecycle, recent files, keyboard e watcher.
- Features: processamento de preview e registro de tipos de arquivo.
- API nativa: `api/tauri.ts` centraliza wrappers para comandos Rust.
- Backend: `src-tauri/src/lib.rs` e `src-tauri/src/setup.rs`.

## Modulos

- `features/files`: extensoes, tipo logico, linguagem Monaco, suporte a preview/export e icones.
- `features/preview`: navegacao entre Markdown, helpers de YouTube/matematica e pos-processamento HTML.
- `services/document-*`: load, persist, save, session e regras de dirty/conflict.
- `services/window-lifecycle`: restauracao, persistencia e flush de abas.
- `services/recovery`: snapshots locais de recuperacao.
- `services/file-watcher`: sincroniza watchers Rust com abas abertas.

## Responsabilidades

- Frontend nao deve acessar filesystem diretamente; deve chamar `tauriCommands`.
- Rust deve retornar `Result<T, String>` nos comandos que podem falhar.
- Preview deve ser sanitizado antes de entrar na UI.
- Estado duravel de preferencias fica em `localStorage`.
- Estado de documento e abas fica em `tabManager` e services associados.

## Dependencias internas

`LayoutView` depende de stores, services, features, componentes e `tauriCommands`. `Editor` depende de Monaco, `settings`, `tabManager`, `jsonUtils` e comandos de clipboard/imagem. `settings` depende de `get_os_type` via `invoke()` direto, uma excecao existente ao wrapper.

## Pontos de acoplamento

- `LayoutView.svelte` ainda concentra muitos fluxos do app.
- `Editor.svelte` mistura Monaco, atalhos, toolbar, clipboard, imagens e validacao JSON.
- O contrato de comandos precisa ficar sincronizado entre `api/tauri.ts`, Rust e `generate_handler!`.
- Classes CSS do Markdown processado precisam continuar compatíveis com os estilos globais.

## Pontos de atencao

- Preserve DOMPurify e CSP ao mexer em HTML externo.
- Alteracoes em autosave, watcher ou dirty state podem causar perda de dados.
- Associacoes de arquivo e instalador Windows exigem cuidado com `#[cfg(target_os = "windows")]`.
- Mudancas de tipos de arquivo devem atualizar frontend, Tauri config e icones quando aplicavel.
