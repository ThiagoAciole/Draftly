# State Management

## Visao geral

Estado e gerenciado com runes do Svelte 5, stores locais em classes e persistencia em `localStorage`.

## Estado local

Componentes usam `$state` para modais, loading, tooltip, find, zoom, drag state, save status e referencias de elementos.

## Estado global

- `tabManager`: abas, aba ativa, dirty state, historico, view state, split, scroll sync e abas fechadas recentemente.
- `settings`: preferencias do editor, preview, UI, idioma, fontes, autosave e comportamento de arquivos.

## Estado remoto

Nao ha estado remoto identificado no codigo atual.

## Formularios

Settings e dialogs controlam preferencias e escolhas do usuario via props/callbacks. Nao ha biblioteca de forms.

## URL state

Informacao nao encontrada no codigo atual. O app e SPA desktop e nao usa rotas para estado de documento.

## Persistencia

- `localStorage`: preferencias, recentes, recovery, sessao de janela e preferencias de split sync.
- Filesystem via Rust: documentos, imagens, temas e arquivos exportados.
- Window state via plugin `tauri-plugin-window-state`.

## Pontos de atencao

- `settings` persiste automaticamente com `$effect.root`.
- `tabManager.serializeState()` nao serializa conteudo completo; a sessao precisa recarregar arquivos depois.
- Mudancas em restore/autosave/recovery precisam de testes porque afetam dados do usuario.
