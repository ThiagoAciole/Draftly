# Current State

## Data da analise

2026-06-27

## Estado atual

Draftly esta em estado funcional com produto desktop, frontend Svelte, backend Rust/Tauri, testes frontend relevantes e empacotamento configurado.

## O que ja existe

- Editor Monaco com suporte a varias linguagens.
- Markdown preview enriquecido e sanitizado.
- Abas, home, recentes, restore de sessao e historico.
- Autosave, recovery e tratamento de conflito externo.
- Configuracoes persistidas, temas, fontes e i18n.
- Exportacao HTML/PDF.
- Instalador/desinstalador Windows e associacoes de arquivo.
- Testes Vitest para services, stores, preview e file-types.

## O que parece em andamento

- `refactor-plan.md` indica intencao de refatoracao.
- Modularizacao ja existe em services/features, mas `LayoutView.svelte` ainda e grande.
- Zen Notes existe como superficie local dentro do app.

## Possiveis pendencias

- Informacao nao encontrada no codigo atual sobre cobertura E2E.
- Informacao nao encontrada no codigo atual sobre pipeline CI ativo alem de estrutura `.github`.
- Algumas strings ainda aparecem inline em ingles/portugues em componentes grandes.

## Riscos

- Perda de dados se autosave, conflict detection, recovery ou dirty state forem alterados sem teste.
- Quebra de preview se sanitizacao, CSP ou classes geradas mudarem sem revisar CSS.
- Quebra de contrato se comando Tauri for alterado só em um lado.
- Instalador Windows envolve registro, atalhos e auto-remocao.

## Proximos passos sugeridos

1. Manter mudancas pequenas e orientadas por arquivo.
2. Cobrir regressao em services antes de mexer em documento/autosave/recovery.
3. Extrair partes de `LayoutView.svelte` apenas quando uma feature tocar diretamente o fluxo.
4. Atualizar esta pasta quando novas features, comandos Tauri ou regras de arquivo forem criadas.
