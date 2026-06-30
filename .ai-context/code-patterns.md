# Code Patterns

## Componentes

- Svelte 5 com `$props`, `$bindable`, `$state`, `$derived` e `$effect`.
- Componentes visuais ficam em `src/lib/components`.
- Views por tipo ficam em `src/lib/views` e compartilham classes de layout.
- Componentes de settings ficam agrupados em `components/settings`.

## Hooks

Nao ha pasta de hooks no codigo atual. Logicas reutilizaveis aparecem como services e utilitarios.

## Services

- Services em `src/lib/services` encapsulam regras testaveis.
- Muitos services recebem dependencias por parametro, facilitando mocks em Vitest.
- Evite empurrar regra de documento nova direto para componente se puder virar service pequeno.

## Tipagem

- Types e interfaces ficam proximos da area que usam.
- `api/tauri.ts` define tipos do contrato nativo.
- `features/files/file-types.ts` centraliza capacidades de tipos de arquivo.

## Imports

- Imports internos usam alias `$lib` em rotas e caminhos relativos dentro de `src/lib`.
- Arquivos TS importados por Svelte usam extensao `.js` onde o build espera.

## Erros

- Comandos Rust expostos ao frontend retornam erro como `String`.
- Frontend geralmente captura erros com `try/catch`, mostra toast/modal ou registra `console.error`.
- Services retornam resultados discriminados quando ha estados esperados, como persistencia.

## Loading

- `loadingTabs` e chips de loading aparecem nas views de preview.
- Estados de salvamento usam `SaveStatus`: `idle`, `saving`, `saved`, `error`, `conflict`.

## Nomenclatura

- Componentes Svelte em PascalCase.
- Stores globais como `*.svelte.ts`.
- Services com nomes por dominio: `document-load`, `document-persist`, `external-file-change`.
- Funcoes e variaveis em camelCase.

## Testes

- Testes frontend ficam ao lado dos arquivos como `*.test.ts`.
- Cobertura atual foca services, stores, preview helpers, processador Markdown e file-types.
- Use mocks de dependencias em vez de depender de Tauri real nos testes frontend.

## O que manter

- Wrapper `tauriCommands` como ponto unico de contrato.
- DOMPurify no preview.
- Stores Svelte 5 em vez de padroes legados.
- Services pequenos e testaveis para regras de documento.
- Separacao entre tipos de arquivo, preview, UI e comandos Rust.

## O que evitar

- Novo `invoke()` direto fora de casos ja existentes sem motivo.
- Acesso Node/filesystem no frontend.
- Refatoracao ampla de `LayoutView.svelte` junto com feature pequena.
- Duplicar lista de extensoes em muitos lugares sem atualizar o registro central.
- Remover testes de regressao em services sensiveis.
