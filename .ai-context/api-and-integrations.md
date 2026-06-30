# API and Integrations

## Visao geral

Nao ha API HTTP de produto. A integracao principal e o contrato frontend/Rust via comandos Tauri e plugins nativos.

## APIs internas

`src/lib/api/tauri.ts` expõe:

- Janela/app: `showWindow`, `getAppMode`, `getStartupFiles`, `isWindows11`, `getOsType`, `getSystemFonts`.
- Arquivos: `readFile`, `writeFile`, `writeBinaryFile`, `copyFile`, `deleteFile`, `renameFile`, `revealFile`, `listDirectory`.
- Markdown: `openMarkdown`, `openMarkdownPreview`, `renderMarkdown`.
- Watcher: `watchFile`, `unwatchFile`.
- Clipboard: `writeClipboardText`, `readClipboardText`, `readClipboardImage`.
- Imagens: `saveImage`, `copyFileToImageDirectory`, `cleanupEmptyImageDirectory`.
- Temas: `saveTheme`, `getSavedVscodeThemes`, `readVscodeTheme`, `fetchVscodeTheme`, `deleteVscodeTheme`.
- Instalacao: `checkInstallStatus`, `installApp`, `uninstallApp`.

## APIs externas

- `fetchVscodeTheme` usa `reqwest` no Rust para buscar tema por URL.
- Preview permite embeds de YouTube em iframe conforme CSP.
- Links externos sao abertos com plugin opener.

## Services

Services frontend encapsulam regras sobre documentos e lifecycle, mas nao sao APIs remotas.

## Autenticacao

Informacao nao encontrada no codigo atual. Nao ha login, token ou autenticacao de usuario.

## Variaveis de ambiente

- `TAURI_DEV_HOST` e lida em `vite.config.js` para HMR em desenvolvimento Tauri.

## Pontos de atencao

- Atualizar comando exige sincronizar Rust, `generate_handler!` e `api/tauri.ts`.
- Nao copiar segredos para docs; nenhum segredo foi identificado.
- CSP em `tauri.conf.json` limita scripts, imagens, connect, frames e fontes.
