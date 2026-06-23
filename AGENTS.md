# AGENTS.md

## Project Overview

Draftly é um aplicativo desktop para abrir, editar, visualizar e exportar arquivos Markdown e texto. Possui abas, preview em tempo real, Monaco Editor, autosave, temas, internacionalização, suporte a Markdown enriquecido e instalador próprio no Windows.

O frontend chama comandos Rust via `invoke()` para acessar arquivos, renderizar Markdown e integrar recursos do sistema operacional.

## Stack

- Svelte 5 com runes
- TypeScript estrito
- SvelteKit em modo SPA
- Vite
- Tauri v2
- Rust
- Monaco Editor
- Comrak, DOMPurify, Highlight.js, KaTeX e Mermaid

## Commands

```bash
npm install
npm run dev
npm run dev:installer
npm run build
npm run preview
npm run check
npm run check:watch
npm test
npm run test:watch
npm run tauri dev
npm run tauri build
cd src-tauri && cargo check
cd src-tauri && cargo test
cd src-tauri && cargo clippy
cd src-tauri && cargo fmt
```

Os testes frontend usam Vitest com ambiente JSDOM.

## Project Structure

```text
src/
  routes/             -> entrada SPA
  lib/components/     -> componentes de interface
  lib/stores/         -> estado global com runes
  lib/services/       -> sessão, recuperação e regras de documentos
  lib/api/            -> wrappers tipados dos comandos Tauri
  lib/utils/          -> Markdown, temas, exportação e helpers
  assets/             -> ícones usados pelo frontend
src-tauri/
  src/lib.rs          -> comandos Tauri e inicialização
  src/setup.rs        -> instalação e associações no Windows
  capabilities/       -> permissões Tauri
  icons/              -> ícones do app e tipos de arquivo
docs/                 -> imagens do README
samples/              -> arquivos de exemplo
static/               -> assets públicos
```

## Important Files

| File | Purpose | Change when |
|---|---|---|
| `src/lib/MarkdownViewer.svelte` | Orquestra janela, abas, arquivos, preview, atalhos e modais | Alterar fluxos principais do app |
| `src/lib/components/Editor.svelte` | Monaco Editor, edição e interação com arquivos/imagens | Alterar comportamento do editor |
| `src/lib/stores/tabs.svelte.ts` | Estado, histórico e persistência das abas | Alterar navegação ou ciclo de abas |
| `src/lib/stores/settings.svelte.ts` | Preferências persistidas em `localStorage` | Criar ou alterar configurações |
| `src/lib/utils/markdown.ts` | Pós-processamento de callouts, matemática, Mermaid e blocos | Alterar renderização rica |
| `src/lib/utils/theme.ts` | Converte temas VS Code em CSS e tema Monaco | Alterar sistema de temas |
| `src/lib/api/tauri.ts` | Contrato tipado entre frontend e Rust | Criar ou alterar comandos Tauri |
| `src-tauri/src/lib.rs` | Arquivos, Markdown, watcher, temas e menus nativos | Criar integração nativa ou comando Tauri |
| `src-tauri/src/setup.rs` | Instalador, desinstalador, atalhos e registro Windows | Alterar instalação no Windows |
| `src-tauri/tauri.conf.json` | Bundle, CSP, associações e janela | Alterar empacotamento ou segurança |

## Coding Guidelines

- Use tabs em Svelte/TypeScript e quatro espaços em Rust.
- Use Svelte 5 (`$state`, `$derived`, `$effect`, `$props`); não introduza padrões legados.
- Nomeie componentes em PascalCase, funções em camelCase e stores como `*.svelte.ts`.
- Mantenha operações de filesystem no Rust; não use APIs Node no frontend.
- Ao criar comando Tauri, retorne `Result<T, String>` e registre-o em `generate_handler!`.
- Preserve sanitização com DOMPurify ao produzir HTML.
- Siga os padrões existentes antes de criar abstrações ou novos módulos.

## Where To Change Things

| Task | Main files/folders |
|---|---|
| Alterar layout ou fluxo principal | `MarkdownViewer.svelte`, `src/styles.css` |
| Criar componente visual | `src/lib/components/` |
| Alterar editor ou toolbar | `Editor.svelte`, `MarkdownToolbar.svelte`, `utils/markdown-toolbar.ts` |
| Alterar abas ou restauração de sessão | `stores/tabs.svelte.ts`, `MarkdownViewer.svelte` |
| Criar configuração | `stores/settings.svelte.ts`, `components/Settings.svelte` |
| Alterar Markdown/preview | `utils/markdown.ts`, `src-tauri/src/lib.rs` |
| Alterar tema ou fontes | `utils/theme.ts`, `Settings.svelte`, `styles.css` |
| Alterar exportação | `utils/export.ts` |
| Alterar arquivos ou integração nativa | `src-tauri/src/lib.rs` |
| Alterar build/instalador | `package.json`, `Cargo.toml`, `tauri.conf.json`, `setup.rs` |

## Safe Change Rules

- Modifique o menor conjunto possível de arquivos.
- Não refatore áreas não relacionadas à tarefa.
- Não adicione dependências ou mova arquivos sem necessidade clara.
- Preserve comportamento multiplataforma; isole código específico com `#[cfg(...)]`.
- Rode `npm run check` e `npm run build`; para Rust, rode `cargo check` e testes relevantes.
- Ao mudar versão, sincronize `package.json` e `src-tauri/Cargo.toml`.
- Não edite arquivos gerados em `build/`, `.svelte-kit/`, `node_modules/`, `src-tauri/target/` ou `src-tauri/gen/`.

## Token Saving Rules

- Use este mapa para abrir somente arquivos relacionados à tarefa.
- Pesquise símbolos e chamadas antes de ler componentes grandes por completo.
- Prefira diffs pequenos e não repita contexto já registrado aqui.
- Em ajustes simples, responda de forma curta e sem documentação extra.
- Resuma apenas arquivos alterados, motivo, validação e riscos reais.

## Response Format For Future Tasks

1. Arquivos alterados
2. Motivo da alteração
3. Código ou diff aplicado
4. Impacto esperado
5. Validação e pontos de atenção

## Do Not

- Não reescreva a arquitetura sem pedido explícito.
- Não crie abstrações antecipadas.
- Não altere dependências, configurações ou padrões visuais sem justificar.
- Não modifique arquivos fora do escopo.
- Não remova sanitização, escrita atômica ou tratamento de alterações externas.
- Não gere documentação extensa para mudanças pequenas.
