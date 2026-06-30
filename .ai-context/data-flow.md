# Data Flow

## Visao geral

O fluxo principal nasce da UI, passa por stores/services, chama comandos Rust quando precisa de filesystem ou sistema, volta como conteudo/HTML e e renderizado nas views.

## Entrada de dados

- Usuario abre arquivo via dialog, associacao do sistema, argumentos de inicializacao ou single-instance.
- Usuario cria nova aba ou template.
- Usuario edita no Monaco.
- Watcher Rust emite eventos de alteracao externa.
- Clipboard e drag-and-drop podem inserir texto/imagens.

## Busca de dados

- `LayoutView` chama `loadDocument`.
- `loadDocument` usa `tauriCommands.readFile` ou `openMarkdownPreview`.
- `api/tauri.ts` chama `invoke()` para comandos Rust.

## Transformacao

- Markdown base e renderizado no Rust.
- `processMarkdownHtml` e `processHtmlPreview` resolvem caminhos, midia, callouts, folding, tasks, block IDs, highlights e sanitizacao.
- `renderRichContent` aplica Highlight.js, KaTeX e Mermaid apos render.
- JSON pode ser validado, formatado ou minificado.

## Estado

- `tabManager` guarda abas, path, conteudo, dirty state, historico e estado visual.
- `settings` guarda preferencias persistidas.
- Componentes usam estado local para modais, loading, tooltip, zoom, find e conflitos.

## Renderizacao

- `LayoutView` escolhe `MarkdownView`, `HtmlView`, `TextView`, `JsonView`, `HomePage` ou `ZenNotes`.
- Views recebem estado e callbacks do shell.
- Editor Monaco atualiza `rawContent`; preview usa `sanitizedHtml`.

## Erros e loading

- Erros de comando viram toast, modal ou log.
- Loading por aba aparece em `loadingTabs`.
- `SaveStatus` mostra salvando/salvo/erro/conflito.

## Cache

- Preferencias, recentes, recovery e sessao de janela usam `localStorage`.
- Temas VS Code salvos usam backend Rust.
- Nao ha cache remoto identificado no codigo atual.
