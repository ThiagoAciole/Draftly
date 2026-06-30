# Domain Rules

## Visao geral

As regras de dominio giram em torno de documentos locais, tipos de arquivo, preservacao de edicoes, preview seguro e integracao desktop.

## Regras principais

- Arquivo sem path em nova aba e tratado como documento novo.
- Markdown vazio ou nova aba Markdown usa linguagem `markdown`.
- Texto puro abre em modo editor sem preview.
- Markdown e HTML podem alternar editor, preview e split.
- Auto-save e ligado por padrao; confirmacao antes de salvar e opcional.
- Alteracao externa pode gerar conflito em vez de sobrescrever silenciosamente.
- Recovery cria snapshots locais para documentos em risco.

## Validacoes

- JSON tem validacao no Monaco com markers e toast.
- Tamanho/preview parcial de Markdown passa por `openMarkdownPreview` com limite em bytes.
- Font sizes e larguras em settings sao clampados por minimo e maximo.

## Permissoes

- Tauri capabilities permitem janela, dialog e opener para janelas `main` e `installer`.
- Acesso a arquivos e clipboard passa por comandos Rust/Tauri.
- Instalador Windows pode usar HKCU ou HKLM dependendo de all-users.

## Fluxos condicionais

- Modo do app pode ser `app`, `installer` ou `uninstall`.
- Views mudam por tipo de arquivo.
- Split view e scroll sync dependem do tipo e preferencias.
- `restoreStateOnReopen` altera comportamento ao sair.
- Instalacao/desinstalacao tem implementacao real no Windows e fallback em outros OS.

## Estados importantes

- `SaveStatus`: `idle`, `saving`, `saved`, `error`, `conflict`.
- `Tab.isDirty`: compara `rawContent` com `originalContent`.
- `Tab.isEditing`, `isSplit`, `isScrollSynced`, `splitRatio`.
- `DocumentSnapshot` para recovery.

## Pontos de atencao

- Nunca remova protecoes de conflito sem nova estrategia.
- Nao renderize HTML sem sanitizacao.
- Ao mudar extensoes, alinhe `file-types`, Tauri bundle e testes.
- Instalador mexe em registro e atalhos; validar com cuidado no Windows.
