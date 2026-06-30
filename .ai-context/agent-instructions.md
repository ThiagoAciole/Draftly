# Agent Instructions

## Antes de comecar

Leia:

1. `.ai-context/context-pack.md`
2. `.ai-context/current-state.md`
3. `.ai-context/architecture.md`
4. `.ai-context/code-patterns.md`
5. `.ai-context/features.md`

Depois abra apenas os arquivos da area da tarefa.

## Ao modificar codigo

- Preserve padroes existentes.
- Faca mudancas pequenas e focadas.
- Nao refatore fora do escopo.
- Use Svelte 5 com runes; nao introduza padroes legados.
- Use `tauriCommands` para chamadas nativas no frontend.
- Mantenha filesystem, clipboard e integracoes de sistema no Rust/Tauri.
- Preserve DOMPurify e regras de sanitizacao.
- Atualize testes quando mexer em services, stores, preview, tipos de arquivo ou regras de documento.
- Explique decisoes importantes quando houver trade-off real.

## Validacao recomendada

- Frontend geral: `npm run check`.
- Testes frontend: `npm test` ou teste especifico.
- Build frontend: `npm run build`.
- Backend Rust: `cd src-tauri && cargo check`.
- Rust tests/clippy/fmt quando alterar logica Rust: `cargo test`, `cargo clippy`, `cargo fmt`.

## Ao finalizar

Atualize arquivos de `.ai-context/` quando a mudanca afetar arquitetura, features, padroes, APIs, estado, regras de negocio, decisoes tecnicas ou instrucoes para agentes.

## O que evitar

- Mudancas grandes sem necessidade.
- Criar padroes novos sem motivo.
- Duplicar logica de tipos de arquivo ou comandos Tauri.
- Ignorar testes de services sensiveis.
- Editar arquivos gerados em `build/`, `.svelte-kit/`, `node_modules/`, `src-tauri/target/` ou `src-tauri/gen/`.
- Remover recovery, autosave, sanitizacao ou tratamento de alteracoes externas sem substituto validado.
