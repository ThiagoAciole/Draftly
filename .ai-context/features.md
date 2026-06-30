# Features

## Abas e navegacao

### O que faz

Gerencia multiplas abas, aba home, historico por aba, reordenacao, split view, estado de scroll e restauracao de estado do Monaco.

### Arquivos principais

`stores/tabs.svelte.ts`, `components/TabList.svelte`, `components/Tab.svelte`, `LayoutView.svelte`.

### Fluxo

`LayoutView` abre ou cria abas via `tabManager`; cada aba guarda path, conteudo, dirty state, historico, split e estado visual.

### Regras importantes

Arquivos Markdown/HTML podem abrir com preview/split; texto e outros tipos tendem a abrir em modo editor.

### Pontos de atencao

Mudancas em dirty state, historico ou restore podem afetar perda de dados e experiencia de reabertura.

## Editor Monaco

### O que faz

Edita conteudo, aplica toolbar Markdown, shortcuts, status bar, validacao JSON, clipboard customizado, paste/drop de imagens e sincronizacao de scroll.

### Arquivos principais

`components/Editor.svelte`, `utils/markdown-toolbar.ts`, `utils/json.ts`, `stores/settings.svelte.ts`.

### Fluxo

O editor recebe `value` da aba ativa, atualiza `tabManager`, salva view state ao trocar/desmontar e chama comandos Tauri para clipboard/imagens.

### Regras importantes

Preferencias de minimap, wrap, fontes, line numbers e status bar vem de `settings`.

### Pontos de atencao

`Editor.svelte` e grande e acoplado ao Monaco; prefira mudancas localizadas.

## Preview Markdown e HTML

### O que faz

Renderiza Markdown no Rust e pos-processa no frontend com links, imagens locais, midia, YouTube, callouts, tasks, matematica, Mermaid, block IDs, folding e highlights.

### Arquivos principais

`features/preview/markdown.processor.ts`, `features/preview/preview-helpers.ts`, `views/MarkdownView.svelte`, `views/HtmlView.svelte`, `src-tauri/src/lib.rs`.

### Fluxo

Rust gera HTML base; frontend sanitiza e transforma DOM; `renderRichContent` aplica bibliotecas ricas apos renderizacao.

### Regras importantes

Todo HTML externo ou transformado deve manter sanitizacao via DOMPurify.

### Pontos de atencao

Classes geradas pelo processor sao contrato com CSS.

## Arquivos e tipos suportados

### O que faz

Mapeia extensoes para tipo logico, linguagem Monaco, icone, preview, formatacao e exportacao.

### Arquivos principais

`features/files/file-types.ts`, `utils/file-icons.ts`, `src-tauri/tauri.conf.json`.

### Fluxo

O path determina linguagem, view e capacidades. Tauri config registra associacoes para Markdown, TXT, JS, HTML e JSON.

### Regras importantes

Markdown vazio e tratado como Markdown para novas abas.

### Pontos de atencao

Nova extensao pode exigir icone, linguagem Monaco, testes e associacao no bundle.

## Autosave, recovery e conflitos

### O que faz

Salva automaticamente com debounce, restaura sessoes, cria snapshots de recuperacao e detecta alteracoes externas.

### Arquivos principais

`services/autosave.ts`, `services/recovery.ts`, `services/document-session.ts`, `services/external-file-change.ts`, `services/window-lifecycle.ts`, `LayoutView.svelte`.

### Fluxo

Edicoes marcam aba como dirty; autosave persiste; watcher Rust emite alteracao externa; dialogs permitem recarregar, manter ou salvar copia.

### Regras importantes

Auto-save padrao fica ativo em settings; existe janela de graca para ignorar eventos gerados pela propria escrita.

### Pontos de atencao

Area sensivel a perda de dados. Teste caminhos de cancelar, salvar, descartar e conflito.

## Configuracoes, temas e i18n

### O que faz

Persistencia de preferencias, temas claro/escuro, fontes, idioma, UI de settings e importacao de temas VS Code.

### Arquivos principais

`stores/settings.svelte.ts`, `components/Settings.svelte`, `components/settings/`, `utils/theme.ts`, `utils/i18n.ts`, `services/theme-watcher.ts`.

### Fluxo

Settings carrega `localStorage`, detecta OS para fontes padrao e persiste mudancas via `$effect`.

### Regras importantes

Idiomas suportados ficam tipados em `LanguageCode`; strings passam por `t(...)` quando localizadas.

### Pontos de atencao

`utils/i18n.ts` e grande; edite chaves com cuidado.

## Exportacao

### O que faz

Prepara preview de exportacao e salva HTML; PDF usa fluxo de impressao.

### Arquivos principais

`components/ExportPreviewModal.svelte`, `utils/export.ts`, `LayoutView.svelte`.

### Fluxo

O conteudo sanitizado da aba ativa alimenta o modal; salvar usa dialog e comando Tauri de escrita.

### Regras importantes

Exportacao depende de HTML ja processado/sanitizado.

### Pontos de atencao

Mudancas no CSS de preview podem afetar HTML exportado.

## Instalador e desinstalador Windows

### O que faz

Verifica instalacao, copia executavel, cria atalhos, registra uninstall, associacoes de arquivo e remove instalacao.

### Arquivos principais

`Installer.svelte`, `Uninstaller.svelte`, `src-tauri/src/setup.rs`, `src-tauri/hooks.nsi`, `src-tauri/tauri.conf.json`.

### Fluxo

Frontend chama `install_app`, `uninstall_app` e `check_install_status`; Rust isola comportamento Windows com `#[cfg(target_os = "windows")]`.

### Regras importantes

Nao misture logica Windows sem `cfg`; fallback non-Windows existe.

### Pontos de atencao

Registro e auto-remocao sao sensiveis; validar em ambiente controlado.
