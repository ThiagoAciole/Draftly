# Project Overview

## O que e

Draftly e um editor e visualizador desktop de arquivos Markdown, texto e formatos relacionados.

## Objetivo

Oferecer uma experiencia local para abrir, editar, visualizar, organizar, salvar e exportar documentos com preview rico e integracao ao sistema operacional.

## Tipo de aplicacao

Aplicacao desktop multiplataforma baseada em Tauri, com frontend SPA em SvelteKit.

## Usuario principal

Usuarios que trabalham com documentos locais, notas, Markdown, texto, JSON, HTML e pequenos arquivos de codigo. O codigo atual nao define persona formal.

## Principais modulos

- Interface principal em `LayoutView.svelte`.
- Editor Monaco em `components/Editor.svelte`.
- Views por tipo de arquivo em `views/`.
- Estado de abas e preferencias em `stores/`.
- Regras de documento em `services/`.
- Preview rico em `features/preview/`.
- Registro de tipos de arquivo em `features/files/`.
- Comandos nativos em `src-tauri/src/lib.rs`.
- Instalacao Windows em `src-tauri/src/setup.rs`.

## Estado geral

O projeto ja possui produto funcional com abas, editor, preview, autosave, recovery, i18n, temas, exportacao, testes frontend para varios services e empacotamento Tauri. Ha concentracao de responsabilidade em `LayoutView.svelte`, mas varias regras importantes ja foram extraidas para services e features testaveis.
