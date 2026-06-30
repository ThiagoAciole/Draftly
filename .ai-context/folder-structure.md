# Folder Structure

## Estrutura resumida

```txt
src/
  routes/
  lib/
    api/
    assets/
    components/
      settings/
    features/
      files/
      preview/
    icons/
    services/
    stores/
    utils/
    views/
  styles.css
src-tauri/
  src/
  capabilities/
  icons/
docs/
samples/
static/
```

## Pastas principais

### `src/routes`

Entrada SPA. `+page.svelte` monta `LayoutView`; `+layout.ts` configura prerender/SPA.

### `src/lib/components`

Componentes de UI e fluxo: editor, title bar, tabs, settings, dialogs, find, TOC, home, command palette, export preview, recovery e zen notes.

### `src/lib/components/settings`

Subsecoes da tela de configuracoes: aparencia, arquivos, geral e preview.

### `src/lib/features/files`

Registro de tipos de arquivo, extensoes, linguagem do Monaco, icones e capacidades.

### `src/lib/features/preview`

Processamento de HTML/Markdown, navegacao relativa, helpers de YouTube e matematica, testes de preview.

### `src/lib/services`

Regras de documento e lifecycle com testes: autosave, load/persist/save, recovery, recent files, tab close, keyboard shortcuts, watcher e alteracoes externas.

### `src/lib/stores`

Stores reativas Svelte 5 para abas e configuracoes.

### `src/lib/utils`

Utilitarios de exportacao, i18n, JSON, Markdown toolbar, templates e temas VS Code.

### `src/lib/views`

Layouts por tipo de arquivo, compartilhando `view-layout.css`.

### `src-tauri/src`

Backend Rust: `lib.rs` com comandos, plugins e menu; `setup.rs` com instalador; `main.rs` chama o runtime.

### `src-tauri/capabilities`

Permissoes Tauri para janelas e plugins.

### `src-tauri/icons`

Icones do app, plataformas e tipos de arquivo.

### `docs`, `samples`, `static`

Imagens do README, arquivos de exemplo e assets publicos.
