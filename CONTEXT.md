# Draftly — Contexto do Projeto para IA

> Use este documento como contexto base antes de pedir qualquer ajuste no projeto.  
> Objetivo: permitir que qualquer IA entenda rapidamente o que o Draftly é, como ele funciona, onde mexer e quais regras não podem ser quebradas.

---

## 1. Resumo do produto

**Draftly** é um aplicativo desktop minimalista para abrir, editar, visualizar e exportar arquivos Markdown, texto, JSON, HTML e alguns arquivos de código leve.

A ideia principal não é competir com uma IDE completa. O Draftly deve funcionar como um **bloco de notas moderno e poderoso**, com foco em:

- escrita rápida;
- edição local de arquivos;
- preview Markdown em tempo real;
- abas;
- busca;
- aparência escura, limpa e minimalista;
- produtividade sem excesso de complexidade;
- suporte a arquivos locais e integração nativa com o sistema operacional.

### Direção de produto

O Draftly deve evoluir como um **workspace minimalista para texto, notas, Markdown, JSON e arquivos leves**, mantendo a sensação de app simples, fluido e bonito.

Evite transformar o projeto em:

- IDE completa;
- editor pesado cheio de painéis;
- app dependente de cloud;
- produto com fluxo complexo demais;
- interface visualmente poluída.

---

## 2. Stack principal

### Frontend

- Svelte 5 com runes (`$state`, `$derived`, `$effect`, `$props`)
- TypeScript
- SvelteKit em modo SPA
- Vite
- Monaco Editor
- DOMPurify
- Highlight.js
- KaTeX
- Mermaid

### Desktop / Backend local

- Tauri v2
- Rust
- Comrak para renderização Markdown
- `notify` para file watcher
- `arboard` para clipboard
- `image` para manipulação de imagens
- `font-kit` para fontes do sistema
- integração com filesystem, clipboard, janelas, temas, instalador e associações de arquivo

### Testes

- Vitest
- JSDOM
- Testes unitários para services, stores e features críticas

---

## 3. Modelo mental da arquitetura

Pense no projeto como camadas:

```text
src/routes/+page.svelte
  -> carrega MarkdownViewer

src/lib/MarkdownViewer.svelte
  -> orquestrador principal do app
  -> janela, abas, preview, salvamento, recovery, atalhos, modais, menus

src/lib/components/
  -> componentes visuais e interativos
  -> Editor, Settings, TitleBar, HomePage, FindBar, CommandPalette, etc.

src/lib/stores/
  -> estado global com Svelte 5 runes
  -> tabs e settings

src/lib/services/
  -> regras de documento, sessão, autosave, recovery, watcher, fechamento seguro

src/lib/features/
  -> lógica por domínio
  -> files, preview, navegação Markdown

src/lib/api/tauri.ts
  -> contrato tipado entre frontend e comandos Rust

src-tauri/src/lib.rs
  -> comandos nativos Tauri/Rust
  -> filesystem, markdown, clipboard, watcher, imagens, temas, JSON, janela
```

---

## 4. Arquivos mais importantes

| Arquivo | Papel | Quando mexer |
|---|---|---|
| `src/lib/MarkdownViewer.svelte` | Orquestra o app inteiro: abas, preview, atalhos, modais, salvamento, recovery, watcher e renderização | Fluxo principal do app, comportamento entre editor/preview, atalhos globais, autosave, conflitos |
| `src/lib/components/Editor.svelte` | Wrapper do Monaco Editor | Comportamento do editor, ações, atalhos internos, JSON tools, paste/drop de imagem, toolbar Markdown |
| `src/lib/stores/tabs.svelte.ts` | Estado das abas | Abas, split view, histórico, estado sujo, sessão, scroll, navegação |
| `src/lib/stores/settings.svelte.ts` | Preferências persistidas | Configurações, defaults, fontes, idioma, aparência, autosave, opções do editor |
| `src/lib/features/preview/markdown.processor.ts` | Pós-processamento do HTML Markdown | Callouts, headings dobráveis, math, Mermaid, vídeos, áudio, imagens, task checkboxes, highlights |
| `src/lib/features/preview/markdown-navigation.ts` | Navegação entre links Markdown | Wikilinks, links relativos, anchors, navegação entre arquivos Markdown |
| `src/lib/features/files/file-types.ts` | Tipos de arquivo suportados | Extensões, linguagem Monaco, ícones, preview/export por tipo |
| `src/lib/api/tauri.ts` | Wrapper tipado dos comandos Tauri | Criar, renomear ou alterar contratos frontend ↔ Rust |
| `src/lib/services/document-load.ts` | Carregamento de documentos | Preview parcial, carregamento completo, distinção Markdown vs texto |
| `src/lib/services/document-persist.ts` | Persistência segura do documento | Autosave, self-write, prevenção de conflito com watcher |
| `src/lib/services/document-save.ts` | Snapshot de salvamento | Controle de TOCTOU: conteúdo salvo vs conteúdo atual |
| `src/lib/services/recovery.ts` | Recovery local | Recuperação de documentos não salvos |
| `src/lib/services/window-lifecycle.ts` | Sessão de janela | Restaurar abas, persistir estado, flush de abas sujas |
| `src/lib/services/external-file-change.ts` | Mudança externa em arquivos | Detectar reload, conflito, arquivo removido ou indisponível |
| `src-tauri/src/lib.rs` | Backend nativo | Filesystem, Markdown Comrak, clipboard, imagens, watchers, JSON, temas, janela |
| `src-tauri/src/setup.rs` | Instalador e integração Windows | Instalador, desinstalador, atalhos, registro, associações no Windows |
| `src-tauri/tauri.conf.json` | Configuração Tauri | Bundle, CSP, file associations, build, NSIS, assets |
| `package.json` | Scripts e dependências frontend | Scripts, libs JS, versões frontend |
| `src-tauri/Cargo.toml` | Dependências Rust | Comandos nativos, dependências Rust, otimização release |

---

## 5. Fluxos principais

### 5.1 Inicialização do app

1. `src/routes/+page.svelte` importa `MarkdownViewer` e `styles.css`.
2. `MarkdownViewer.svelte` decide o modo inicial: `loading`, `app`, `installer` ou `uninstall`.
3. O frontend consulta comandos Tauri para modo do app, arquivos de inicialização, tema salvo e dados de sistema.
4. O app restaura abas/sessão quando `settings.restoreStateOnReopen` está ativo.
5. Em desktop, o Rust configura a janela manualmente via Tauri, pois `tauri.conf.json` usa `windows: []`.

### 5.2 Abrir arquivo

Fluxo mental:

```text
usuário escolhe arquivo
  -> MarkdownViewer.loadMarkdown(path)
  -> tabManager cria/ativa aba
  -> document-load.ts decide se é Markdown ou texto
  -> Rust lê/renderiza arquivo
  -> markdown.processor.ts pós-processa HTML
  -> DOMPurify sanitiza
  -> preview é renderizado
```

Detalhes importantes:

- Markdown usa preview parcial para arquivos grandes e depois carrega o conteúdo completo em background.
- Arquivos não Markdown entram em modo editor/texto.
- Markdown tende a abrir em split view por padrão.
- O caminho aberto entra em arquivos recentes.

### 5.3 Editar conteúdo

Fluxo mental:

```text
Monaco muda conteúdo
  -> Editor.svelte emite value
  -> tabManager.updateTabRawContent()
  -> aba fica dirty se rawContent !== originalContent
```

Detalhes importantes:

- `rawContent` é o texto real do editor.
- `content` é o HTML renderizado usado pelo preview.
- `originalContent` representa o último conteúdo salvo/carregado.
- `isDirty` sempre deve ser calculado comparando `rawContent` com `originalContent`.

### 5.4 Salvar arquivo

Fluxo mental:

```text
saveContent()
  -> tira snapshot do rawContent antes do await
  -> persistDocument()
  -> document-save.ts escreve snapshot
  -> Rust atomic_write()
  -> compara conteúdo atual com snapshot
  -> mantém dirty se usuário digitou durante o save
```

Regras críticas:

- Não force `isDirty = false` depois de salvar.
- O projeto já protege contra TOCTOU: usuário pode digitar enquanto o save está em andamento.
- O resultado correto é: salvo o snapshot antigo, mas se o conteúdo atual mudou, a aba continua dirty.
- O Rust usa escrita atômica. Não troque por `fs::write` simples.
- O self-write evita que o file watcher recarregue o próprio save e sobrescreva alterações locais.

### 5.5 Autosave

O autosave fica em `MarkdownViewer.svelte` e usa timers por aba.

Regras:

- Autosave só deve salvar abas dirty, com path real e em modo editável.
- Abas untitled não devem ser autosalvas sem diálogo.
- `confirmBeforeSave` desativa salvamento silencioso.
- Timers por aba são importantes para salvar abas em background sem depender da aba ativa.
- Não cancele timers antes de modais; cancelar só quando o usuário confirmar save/discard.

### 5.6 Preview Markdown

Fluxo mental:

```text
raw Markdown
  -> Rust convert_markdown() com Comrak
  -> HTML base
  -> markdown.processor.ts
  -> DOMPurify
  -> renderRichContent()
  -> Highlight.js, Mermaid, KaTeX, copy buttons, embeds
```

O pipeline é dividido entre Rust e TypeScript:

#### Rust faz

- conversão Markdown com Comrak;
- wikilinks internos;
- embeds `![[arquivo]]`;
- block IDs;
- highlights `==texto==`;
- footnotes inline;
- source positions para scroll sync.

#### TypeScript faz

- resolver imagens locais com `convertFileSrc`;
- transformar áudio/vídeo;
- embed de YouTube;
- callouts estilo Obsidian/GitHub;
- headings dobráveis;
- task checkboxes clicáveis;
- matemática inline/display;
- Mermaid;
- syntax highlight;
- botões de copiar código;
- sanitização final.

Regra crítica: **não remova DOMPurify**. O Rust permite HTML unsafe no Comrak para suportar recursos ricos, então a sanitização no frontend é uma proteção importante.

### 5.7 Abas e sessão

A fonte principal é `tabManager` em `src/lib/stores/tabs.svelte.ts`.

Cada aba guarda:

- `id`
- `path`
- `title`
- `content`
- `rawContent`
- `originalContent`
- `scrollTop`
- `isDirty`
- `isEditing`
- `navigationHistory`
- `navigationIndex`
- `editorViewState`
- `scrollPercentage`
- `anchorLine`
- `isSplit`
- `splitRatio`
- `isScrollSynced`
- `newFileType`

Regras:

- Markdown abre em split view por padrão.
- TXT/log abrem em editor simples.
- JSON abre como editor com validação/format/minify.
- Estado de sessão não deve serializar HTML renderizado pesado.
- `editorViewState` não deve ser persistido diretamente em JSON de sessão.

### 5.8 Recovery

Recovery usa `localStorage` com chave `draftly.recovery.v1`.

Regras:

- Salva snapshots de abas sujas ou untitled com conteúdo.
- Limita a 20 snapshots.
- Se o storage lotar, tenta salvar menos snapshots.
- Ao salvar uma aba com sucesso e ela deixar de estar dirty, remova o recovery correspondente.

### 5.9 Mudança externa de arquivo

Fluxo mental:

```text
Rust notify detecta mudança
  -> emite file-changed
  -> MarkdownViewer.handleExternalFileChange()
  -> inspectExternalFileChange()
  -> reload / conflict / missing / unavailable
```

Regras:

- Se arquivo externo mudou e aba não está dirty: recarregar.
- Se arquivo externo mudou e aba está dirty: abrir conflito.
- Se arquivo sumiu: preservar cópia aberta e marcar como dirty.
- Se mudança veio do próprio save do Draftly: ignorar durante grace period de self-write.

### 5.10 Editor Monaco

`Editor.svelte` concentra:

- criação do Monaco;
- configurações de visual/editor;
- word wrap por tipo de arquivo;
- minimap só para código;
- line numbers;
- status bar;
- toolbar Markdown;
- ações do editor;
- atalhos;
- validação JSON;
- format/minify JSON;
- paste inteligente;
- clipboard via Rust;
- paste/drop de imagem;
- scroll sync com preview;
- restauração de posição.

Regras:

- Evite criar outro editor paralelo.
- Use `Editor.svelte` como ponto de integração com Monaco.
- Para novas ações do editor, prefira `editor.addAction` ou funções de toolbar existentes.
- Para Markdown toolbar, use `MarkdownToolbar.svelte` + `utils/markdown-toolbar.ts` + `applyMarkdownToolbarAction`.

### 5.11 Imagens, clipboard e mídia

O app suporta:

- colar imagem do clipboard;
- salvar imagem em pasta relativa configurável, padrão `img`;
- arrastar imagem para o editor;
- inserir embed Markdown `![alt](img/arquivo.png)`;
- limpar imagem colada se undo remover o embed;
- autocompletar paths de arquivos/imagens em contexto Markdown.

Regras:

- Operações reais de arquivo/imagem devem ficar no Rust.
- Caminho de pasta de imagem deve ser relativo.
- Validar nomes de arquivo no Rust.
- Não usar APIs Node no frontend.

### 5.12 Configurações

Settings são centralizadas em `src/lib/stores/settings.svelte.ts`.

Principais grupos:

- Geral
- Aparência
- Preview
- Arquivos
- Editor geral
- Markdown
- JSON
- Texto

Preferências importantes:

- minimap;
- word wrap Markdown/texto;
- line numbers;
- status bar;
- word count;
- tabs/sidebar;
- restore state;
- TOC;
- Markdown toolbar;
- highlight color;
- start in editor;
- recent files;
- editor/preview max width;
- image directory;
- macOS image scaling;
- idioma;
- fontes e tamanhos;
- autosave;
- confirm before save.

Regras:

- Nova configuração deve entrar no store.
- Deve carregar valor do `localStorage`.
- Deve persistir via `$effect.root`.
- Deve ter reset em `resetAllSettings()` quando fizer sentido.
- Deve aparecer em `Settings.svelte` se for controlável pelo usuário.
- Traduções devem usar `utils/i18n.ts`.

---

## 6. Onde mexer por tipo de pedido

| Pedido | Comece por | Também verifique | Cuidado |
|---|---|---|---|
| Alterar layout principal | `MarkdownViewer.svelte` | `src/styles.css`, `TitleBar.svelte`, `HomePage.svelte` | Não quebrar modos app/installer/uninstall |
| Alterar editor | `Editor.svelte` | `settings.svelte.ts`, `MarkdownToolbar.svelte` | Monaco tem lifecycle próprio; preserve dispose/viewState |
| Criar botão na toolbar Markdown | `MarkdownToolbar.svelte` | `utils/markdown-toolbar.ts`, `Editor.svelte` | Atualize seleção/cursor corretamente |
| Alterar preview Markdown | `markdown.processor.ts` | `src-tauri/src/lib.rs`, testes de markdown processor | Pipeline é Rust + DOM post-process |
| Alterar renderização Markdown base | `src-tauri/src/lib.rs` | `markdown.processor.ts` | Comrak unsafe exige sanitização no frontend |
| Alterar salvamento | `MarkdownViewer.svelte` | `document-persist.ts`, `document-save.ts`, `src-tauri/src/lib.rs` | Não quebrar TOCTOU, atomic write e self-write |
| Alterar autosave | `MarkdownViewer.svelte` | `settings.svelte.ts`, `document-persist.ts` | Timers são por aba |
| Alterar abas | `tabs.svelte.ts` | `MarkdownViewer.svelte`, testes de tabs | Preserve dirty state, split e sessão |
| Alterar sessão/recovery | `window-lifecycle.ts`, `recovery.ts` | `MarkdownViewer.svelte`, `tabs.svelte.ts` | Não persistir HTML pesado desnecessário |
| Alterar file watcher | `file-watcher.ts`, `external-file-change.ts` | Rust `watch_file`, `unwatch_file` | Não recarregar self-write |
| Alterar tipos de arquivo | `file-types.ts` | `tauri.conf.json`, ícones, Monaco languages | Atualize associações se necessário |
| Alterar JSON tools | `Editor.svelte` | `utils/json.ts`, Rust JSON commands | Validação usa Monaco markers |
| Alterar temas | `utils/theme.ts` | `Settings.svelte`, Rust theme commands | Tema afeta Monaco e CSS vars |
| Alterar configurações | `settings.svelte.ts` | `Settings.svelte`, `i18n.ts` | Persistência e reset |
| Alterar exportação | `utils/export.ts` | `ExportPreviewModal.svelte`, `MarkdownViewer.svelte` | Use HTML sanitizado/renderizado |
| Alterar instalador | `src-tauri/src/setup.rs` | `tauri.conf.json`, `Cargo.toml`, `hooks.nsi` | Windows registry/atalhos/associações |
| Alterar integração nativa | `src-tauri/src/lib.rs` | `api/tauri.ts` | Registrar comando no `generate_handler!` |

---

## 7. Regras de código para IA

### Svelte/TypeScript

- Use Svelte 5 com runes.
- Não introduza padrões legados desnecessários.
- Use TypeScript explícito em tipos públicos.
- Componentes em PascalCase.
- Stores globais como `*.svelte.ts`.
- Use tabs em Svelte/TypeScript se estiver seguindo o padrão do projeto.
- Evite mover arquivos sem necessidade.
- Evite refatorar áreas fora do escopo do pedido.

### Rust/Tauri

- Comandos Tauri devem retornar `Result<T, String>` quando puderem falhar.
- Registre novos comandos em `tauri::generate_handler!`.
- Crie wrapper tipado correspondente em `src/lib/api/tauri.ts`.
- Filesystem deve ficar no Rust, não no frontend.
- Código específico de OS deve usar `#[cfg(...)]`.
- Preserve escrita atômica para salvar arquivos.

### Segurança

- Não remova DOMPurify.
- Não afrouxe CSP sem justificativa forte.
- Não permita path traversal em operações de imagem/tema/arquivo.
- Não aceite diretórios absolutos para `imageDirectory`.
- Não confie em HTML Markdown sem sanitização.

### UX

- Manter visual minimalista, escuro, limpo e produtivo.
- Evitar excesso de botões e painéis.
- Preservar atalhos existentes.
- Não quebrar teclado/fluxo rápido de escrita.
- Priorizar pequenos refinamentos de UI sobre grandes mudanças visuais.

---

## 8. Áreas frágeis que exigem atenção

### 8.1 `MarkdownViewer.svelte` é grande

Ele concentra muita coisa:

- estado global de tela;
- comandos;
- atalhos;
- abertura de arquivo;
- salvamento;
- autosave;
- preview;
- modais;
- recovery;
- watcher;
- link handling;
- menus;
- exportação;
- drag/drop.

Ao mexer nele:

- procure primeiro a função específica;
- evite refatorar tudo;
- extraia para service somente se a tarefa pedir ou se reduzir risco;
- preserve comportamento existente.

### 8.2 Salvamento tem proteção contra race condition

Não simplifique o fluxo para:

```ts
await writeFile(path, content);
tab.isDirty = false;
```

Isso está errado para este projeto.

O correto é manter snapshot e comparar com conteúdo atual após o await.

### 8.3 Preview Markdown tem duas fases

Não coloque tudo só no Rust ou só no frontend sem motivo.

- Rust: Markdown base e preprocess textual.
- Frontend: DOM enhancement, mídia, callouts, math, Mermaid, sanitização.

### 8.4 File watcher pode sobrescrever alterações locais

Sempre respeite:

- self-write grace period;
- `originalContent`;
- `isDirty`;
- conflito externo.

### 8.5 Estado de aba é fonte de verdade

Não crie estados paralelos para conteúdo ativo sem sincronizar com `tabManager`.

---

## 9. Testes existentes e validação

Há testes para:

- tipos de arquivo;
- recovery;
- fechamento de abas;
- sessão de abas;
- file watcher;
- persistência de documento;
- arquivos recentes;
- salvamento;
- navegação Markdown;
- processador Markdown;
- carregamento de documento;
- sessão de documento;
- ciclo de vida da janela;
- mudança externa de arquivo.

### Comandos úteis

```bash
npm install
npm run dev
npm run check
npm run build
npm test
npm run tauri dev
npm run tauri build
cd src-tauri && cargo check
cd src-tauri && cargo test
cd src-tauri && cargo clippy
cd src-tauri && cargo fmt
```

### Validação mínima por tipo de mudança

| Mudança | Validação recomendada |
|---|---|
| UI simples | `npm run check` |
| Store/service | `npm test` + `npm run check` |
| Markdown preview | testes de markdown processor + abrir `.md` com callouts, code, math, Mermaid |
| Salvamento/autosave | teste manual com múltiplas abas + `npm test` |
| Rust/Tauri | `cargo check` + `npm run tauri dev` |
| Bundle/instalador | `npm run tauri build` |

---

## 10. Prompt base para pedir ajustes a uma IA

Use este modelo ao pedir mudanças:

```md
Você está trabalhando no projeto Draftly.
Leia o contexto do projeto antes de alterar qualquer coisa.

Objetivo da mudança:
[descreva exatamente o que quero]

Comportamento esperado:
- [item 1]
- [item 2]
- [item 3]

Arquivos prováveis:
- [opcional: cite arquivos se souber]

Restrições:
- Preserve Svelte 5 runes.
- Não remova DOMPurify.
- Não altere salvamento/autosave sem preservar TOCTOU e self-write.
- Não use filesystem direto no frontend.
- Faça o menor diff possível.
- Não transforme o app em IDE pesada.

Entrega esperada:
1. Arquivos alterados
2. Motivo da alteração
3. Diff ou código aplicado
4. Impacto esperado
5. Como validar
```

---

## 11. Formato de resposta esperado da IA

Quando uma IA fizer ajustes no Draftly, ela deve responder assim:

```md
## Arquivos alterados
- `caminho/do/arquivo`: o que mudou

## Motivo
Explicação curta da decisão.

## Alteração
Código ou resumo do diff.

## Impacto
O que muda para o usuário/projeto.

## Validação
- comando rodado ou recomendado
- teste manual recomendado

## Riscos
- listar apenas riscos reais
```

---

## 12. Diretrizes de evolução do projeto

### Bom caminho

- Modularizar aos poucos `MarkdownViewer.svelte` quando houver oportunidade clara.
- Manter `services/` para regras testáveis.
- Manter `features/` para domínios isolados.
- Melhorar settings sem poluir a interface.
- Melhorar performance de preview/render sem perder recursos ricos.
- Melhorar acessibilidade de modais, menus e navegação por teclado.
- Melhorar UX de escrita, foco e atalhos.

### Evitar

- Refatoração gigante sem necessidade.
- Dependências grandes para problemas pequenos.
- Duplicar estado de documento fora do `tabManager`.
- Salvar arquivo de forma não atômica.
- Mexer no pipeline Markdown sem testes.
- Alterar visual geral sem preservar identidade minimalista.
- Adicionar cloud/login/sync como requisito central.

---

## 13. Resumo curto para colar em prompts menores

```md
Draftly é um app desktop Tauri v2 + Svelte 5 + TypeScript + Rust. É um editor minimalista para Markdown, TXT, JSON, HTML e arquivos leves, com Monaco Editor, abas, preview Markdown, split view, busca, temas, recovery, autosave, exportação e integração nativa.

Arquitetura: `MarkdownViewer.svelte` orquestra o app; `Editor.svelte` encapsula Monaco; `tabs.svelte.ts` gerencia abas; `settings.svelte.ts` gerencia preferências; `services/` contém regras testáveis de documento/sessão/recovery/watcher; `features/preview` processa Markdown; `api/tauri.ts` tipa comandos Rust; `src-tauri/src/lib.rs` implementa filesystem, Markdown Comrak, clipboard, watcher, imagens, temas e JSON.

Regras críticas: usar Svelte 5 runes; manter filesystem no Rust; não remover DOMPurify; preservar escrita atômica; preservar TOCTOU no save; preservar self-write contra watcher; fazer menor diff possível; não transformar o app em IDE pesada.
```

---

## 14. Checklist antes de qualquer alteração

- [ ] Entendi se a mudança é UI, editor, preview, arquivo, settings ou integração nativa.
- [ ] Abri os arquivos corretos pelo mapa acima.
- [ ] Não estou mexendo em áreas fora do escopo.
- [ ] Não estou quebrando salvamento/autosave.
- [ ] Não estou removendo sanitização.
- [ ] Não estou criando filesystem no frontend.
- [ ] Atualizei testes ou indiquei validação quando necessário.
- [ ] Mantive a experiência minimalista.

---

## 15. Contexto de produto em uma frase

**Draftly é um editor desktop local, minimalista e elegante para Markdown e arquivos de texto/código leve, com preview poderoso e fluxo rápido de escrita, sem virar uma IDE pesada.**
