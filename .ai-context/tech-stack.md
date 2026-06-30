# Tech Stack

## Linguagem

- TypeScript no frontend.
- Rust no backend Tauri.
- Svelte como linguagem de componentes.

## Framework

- Svelte 5 com runes.
- SvelteKit configurado como SPA.
- Tauri v2 para desktop.

## Build

- Vite.
- `@sveltejs/adapter-static`.
- Tauri CLI.
- Cargo.

## UI

- Componentes Svelte proprios.
- Monaco Editor.
- CSS global em `src/styles.css` e CSS compartilhado das views em `src/lib/views/view-layout.css`.
- Icones PNG/SVG locais.

## Estado

- Stores Svelte 5 em `tabs.svelte.ts` e `settings.svelte.ts`.
- Estado local com `$state`, `$derived` e `$effect`.
- Persistencia em `localStorage`.

## Dados e API

- `@tauri-apps/api/core` para `invoke`.
- `src/lib/api/tauri.ts` como wrapper tipado.
- Plugins Tauri: dialog, opener, single-instance, window-state e prevent-default.

## Testes

- Vitest.
- JSDOM.
- Testes em `src/**/*.test.ts`, principalmente services, stores e preview.

## Qualidade de codigo

- `svelte-check` via `npm run check`.
- TypeScript estrito via `tsconfig.json`.
- Cargo check/test/clippy/fmt disponiveis para Rust, embora nem todos estejam em scripts npm.

## Scripts importantes

- `npm run dev`: Vite dev.
- `npm run dev:installer`: Tauri dev em modo instalador.
- `npm run build`: build frontend.
- `npm run check`: Svelte/type check.
- `npm test`: Vitest.
- `npm run tauri dev`: app desktop em dev.
- `npm run tauri build`: bundle desktop.
- `cd src-tauri && cargo check`: validacao Rust.
