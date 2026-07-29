# Plano de implementação: remoção das funcionalidades de IA

> **Para agentes executores:** SUB-SKILL OBRIGATÓRIO: usar superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para implementar este plano tarefa por tarefa. As etapas usam caixas de seleção (`- [ ]`) para acompanhamento.

**Objetivo:** Remover a integração Gemini/IA do Draftly sem alterar os fluxos Markdown existentes.

**Arquitetura:** Eliminar as entradas de UI e dependências de IA nas fronteiras atuais, simplificar `SettingsContext` para as preferências restantes e remover o comando Rust/cliente HTTP. Os arquivos exclusivamente de IA serão apagados.

**Stack:** React, TypeScript, Vite, Tauri v2, Rust, Vitest.

## Restrições globais

- Preservar edição Markdown, abas, configurações não relacionadas e operações locais.
- Não criar nova abstração para substituir a IA.
- Não alterar arquivos fora do checkout `C:\Projetos\Draftly`.
- Validar com busca de referências, testes frontend, build frontend e compilação Rust quando disponível.

### Tarefa 1: Remover pontos de entrada da UI e estado de configurações

**Arquivos:**
- Modificar: `src/components/layout/TitleBar.tsx`, `src/components/editor/MarkdownEditor.tsx`, `src/components/settings/SettingsModal.tsx`, `src/contexts/SettingsContext.tsx` e imports afetados.
- Remover: `src/components/ai/*` quando não houver mais consumidores.

- [ ] Remover imports, menus, aba `ai` e campos `settings.ai`, preservando as demais abas e preferências.
- [ ] Remover os componentes de IA que ficarem sem consumidores.
- [ ] Executar `rg -n -i "ai|ia|gemini|assistência" src` e confirmar que só restam referências não funcionais, se houver.

### Tarefa 2: Remover camada de IA e backend

**Arquivos:**
- Remover: `src/lib/ai/*`.
- Modificar: `src-tauri/src/lib.rs`, `src-tauri/Cargo.toml`, `package.json`, `package-lock.json` e configurações de ambiente/documentação afetadas.

- [ ] Remover o comando `run_gemini_action`, registros de plugins HTTP e imports/dependências exclusivas do Gemini.
- [ ] Remover dependências npm/Rust exclusivas da IA somente quando não forem usadas por outro módulo.
- [ ] Remover menções a `GEMINI_API_KEY`, `gemini` e `run_gemini_action` de arquivos ativos.

### Tarefa 3: Limpar estilos e documentação

**Arquivos:**
- Modificar: `src/styles/editor.css`, `src/styles/settings.css`, `README.md`, `DESIGN.md` ou outros arquivos encontrados pela busca.

- [ ] Remover regras CSS exclusivas da IA sem tocar em estilos compartilhados.
- [ ] Atualizar documentação ativa para refletir o produto sem IA.

### Tarefa 4: Validar a remoção

- [ ] Executar busca final por referências de IA no código ativo e configurações.
- [ ] Executar `npm test -- --run`.
- [ ] Executar `npm run build`.
- [ ] Executar `cargo check` em `src-tauri` se o toolchain estiver disponível.
- [ ] Revisar `git diff` e `git status --short`, confirmando que apenas a remoção solicitada foi feita.
