# UI Patterns

## Design system

Nao ha design system formal separado. A UI usa componentes proprios, variaveis CSS globais e estilos compartilhados para views.

## Componentes visuais

- `TitleBar`, `TabList`, `Tab`, `HomePage`, `Settings`, `Modal`, `Toast`, `FindBar`, `Toc`, `CommandPalette`, `ExportPreviewModal`, `RecoveryDialog`, `ExternalConflictDialog`, `ZoomOverlay`, `ZenNotes`.
- Icones passam por `SvgIcon`, componentes de icone ou assets em `assets/file-icons`.

## Layout

- Janela tem title bar customizada.
- Conteudo principal alterna entre Home, Zen Mode ou view por tipo de arquivo.
- Markdown/HTML podem usar split editor-preview com barra redimensionavel.
- Texto e JSON usam layout focado no editor.

## Estilos

- `src/styles.css` concentra tokens e estilos globais.
- `src/lib/views/view-layout.css` concentra layout compartilhado das views.
- Componentes tambem possuem `<style>` local.

## Temas e tokens

- Tema claro/escuro e temas VS Code aplicam variaveis CSS.
- Monaco recebe temas `app-theme-dark` e `app-theme-light`.
- Fontes padrao variam por OS em `settings.svelte.ts`.

## Responsividade

O app e desktop-first. O codigo usa flex layouts, paineis redimensionaveis, barras laterais e largura maxima configuravel para editor/preview.

## Acessibilidade

Ha uso de `visually-hidden`, `role`, `aria` em partes da UI, dialogs e controles. Informacao nao encontrada no codigo atual sobre auditoria completa de acessibilidade.

## Estados visuais

- Toasts para feedback rapido.
- Save status fixo no canto inferior.
- Loading chip para previews.
- Dialogs para recovery, conflito externo e confirmacoes.
- Estados ativos em rails, tabs, toolbar e botões.
