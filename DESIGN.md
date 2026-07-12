# DESIGN.md — Draftly

Documento de design objetivo baseado no código atual do projeto (v0.1.0).

---

## 1. Visão do Produto

**Draftly** é um editor Markdown desktop minimalista, local-first, com edição visual (WYSIWYG) via BlockNote. v1 MVP suporta apenas arquivos `.md`.

### Frase do Produto

> Um editor visual de Markdown para desktop, com escrita sem distração, tabs, e aparência premium.

---

## 2. Tech Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 19, TypeScript, Vite 6 |
| Desktop shell | Tauri v2 (Rust) |
| Editor | BlockNote (`@blocknote/react` + `@blocknote/mantine`) v0.51.4 |
| UI primitives | Radix UI (dropdown-menu, tooltip), Lucide React v0.468 |
| State management | React Context API — 4 contextos de domínio |
| Estilização | CSS customizado por grupo de componente |
| Window | `decorations: false` — titlebar customizada |

### Dependências de Produção

```
@blocknote/core, @blocknote/mantine, @blocknote/react
@radix-ui/react-dropdown-menu, @radix-ui/react-tooltip, @radix-ui/react-dialog, @radix-ui/react-separator
@tauri-apps/api, @tauri-apps/plugin-dialog
lucide-react
```

---

## 3. Design Tokens

### 3.1 Cores (globals.css `:root`)

```css
--bg: #1e1e1e;
--bg-elevated: #242424;
--bg-panel: #2d2d2d;
--border: #3a3a3a;
--border-soft: #303030;
--text: #eeeeee;
--muted: #b0b0b0;
--faint: #8a8a8a;
--accent: #8b6cff;
--accent-soft: rgba(139, 108, 255, 0.18);
--danger: #ff6b6b;
```

### 3.2 Tipografia

- **Família**: `Cantarell, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`
- **Monospace**: `"Cascadia Code", "Fira Code", ui-monospace, SFMono-Regular, Menlo, monospace`
- **Tamanho base**: 14-15px (UI), 18px (corpo do editor)
- **Peso**: 400 (normal), 500-600 (medium/semibold), 700 (bold)
- **Line-height**: 1.65 (editor corpo), 1.15 (headings)

### 3.3 Espaçamento e Bordas

- **Border radius**: 7-12px (botões), 8-10px (containers), 12px (janela)
- **Gaps**: 2-4px (toolbar), 8-12px (containers), 22px (status bar)
- **Altura do titlebar**: 48px
- **Altura da status bar**: 30px
- **Toolbar do editor**: 38px de altura, container com 64px (toolbar + padding)

### 3.4 Aparência de Janela

- `decorations: false` — a app desenha sua própria titlebar
- Tamanho padrão: 1088×704, mínimo: 860×560

---

## 4. Arquitetura

### 4.1 Estrutura de Componentes

```
App
 └─ WorkspaceProvider
     └─ TabsProvider
         └─ FileActionsProvider
             └─ AppShell
                  ├─ TitleBar
                  │    ├─ WindowBrand (logo + botão home)
                  │    ├─ TabStrip
                  │    │    ├─ FileTabs
                  │    │    └─ NewTabButton
                  │    └─ TitleActions
                  │         ├─ FileMenu (Radix Dropdown)
                  │         └─ WindowControls (min/max/close)
                  ├─ ErrorBanner (condicional)
                  ├─ [Home] ou [Editor + StatusBar]
                  │    ├─ Home
                  │    │    ├─ HomeHero (logo + ações)
                  │    │    └─ RecentFiles (grid 3 colunas)
                  │    ├─ MarkdownEditor (lazy)
                  │    │    ├─ EditorToolbar
                  │    │    │    ├─ FormatButtons (bold/italic/strike/underline/code/link)
                  │    │    │    ├─ ColorPicker (popover)
                  │    │    │    ├─ HeadingButtons (h1/h2/h3)
                  │    │    │    ├─ BlockButtons (quote/bullet/numbered/check/toggle/code/table/image)
                  │    │    │    ├─ LinkModal
                  │    │    │    └─ ImageModal (drag & drop + file picker)
                  │    │    ├─ BlockNoteView (theme="dark")
                  │    │    │    ├─ CustomSideMenu (delete block + divider)
                  │    │    │    └─ SlashMenu (traduzido para pt-BR)
                  │    │    └─ CustomScrollbar (auto-hide 900ms)
                  │    └─ StatusBar (lazy)
                  └─ [EditorLoading] (Suspense fallback)
```

### 4.2 Contextos (State Management)

São exatamente **4 contextos**. Aninhamento no `App.tsx` (externo → interno):

| # | Contexto | Hook | Responsabilidade |
|---|---|---|---|
| 1 | `SettingsContext` | `useSettings()` | Preferências persistidas, tokens CSS e store de sessão |
| 2 | `WorkspaceContext` | `useWorkspace()` | `view` ("home"\|"editor"), `isBusy`, `error`, setters |
| 3 | `TabsContext` | `useTabsContext()` | `tabs[]`, `activeTab`, `recentFiles`, CRUD de tabs |
| 4 | `FileActionsContext` | `useFileActions()` | Operações async: open, save, create, close, initialize |

**Regra**: Componentes nunca importam de `src/state/`. Todo estado vem dos contextos.

### 4.3 Tipos de Dados

```typescript
type WorkspaceView = "home" | "editor";

type DocumentTab = {
  id: string;
  path: string | null;
  name: string;
  markdown: string;
  isDirty: boolean;
  lastSavedAt: Date | null;
};

type RecentFile = {
  path: string;
  name: string;
  openedAt: string; // ISO string, max 9 no localStorage
};

type TabsMeta = {
  id: string;
  path: string | null;
  name: string;
  isDirty: boolean;
};

type MarkdownFile = {
  path: string;
  name: string;
  content: string;
};
```

### 4.4 Fluxo de Dados

```
[Arquivo .md em disco]
       ↓ invoke()
[src-tauri/src/lib.rs]  ←  read_markdown_file / write_markdown_file / get_initial_markdown_file_path
       ↓
[src/lib/fs.ts]  ← única camada que chama invoke()
       ↓
[FileActionsContext]  ← operações async (open, save, create, close)
       ↓
[TabsContext]  ← estado dos documentos (tabs, activeTab, isDirty)
       ↓
[MarkdownEditor]  ← BlockNote: markdown ↔ blocks
```

**Regra**: Apenas `src/lib/fs.ts` importa de `@tauri-apps/api/core` e chama `invoke()`.

---

## 5. Layout Geral

### 5.1 Grid do AppShell

```css
.app-shell {
  display: grid;
  grid-template-rows: 48px minmax(0, 1fr) 30px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: #242424;
}
```

```
┌────────────────────────────────────────────────────────────┐
│ TitleBar (48px)                                            │
│ ┌──────┬──────────────────────────────────┬──────────────┐ │
│ │ Logo │ FileTabs              [+ Nova]  │ FileMenu Win │ │
│ └──────┴──────────────────────────────────┴──────────────┘ │
├────────────────────────────────────────────────────────────┤
│ Main Content (1fr)                                         │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ HOME: hero (logo + botões) + recentes (grid 3 col)    │ │
│ │ ou                                                     │ │
│ │ EDITOR: toolbar (64px area) + BlockNote + scrollbar    │ │
│ └────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────┤
│ StatusBar (30px)                                           │
│ Salvo 14:30  │  Markdown  │  UTF-8  │  /caminho/arquivo   │
└────────────────────────────────────────────────────────────┘
```

### 5.2 TitleBar

- **Layout**: grid 3 colunas — `56px` (logo) `1fr` (tabs) `auto` (ações)
- **Background**: `#303030`
- **Logo**: botão home com `icon.svg` (16×16, opacity 0.88), área clicável 40×40
- **Tabs**: altura 40px, flex basis 240px, min 200px, bordas arredondadas no topo (8px)
- **Tab ativa**: `#ffffff` sobre `#242424`, com cantos curvos negativos internos (radial-gradient)
- **Botão fechar tab**: visível apenas no hover da tab ou tab ativa
- **Dirty dot**: bolinha de 7px com cor `--accent` ao lado do nome

### 5.3 Home

- **Layout**: centralizado vertical e horizontalmente, padding `40px 32px 72px`
- **Hero**: logo (56×56) + 2 botões ("Abrir arquivo" primary, "Novo Arquivo" secondary)
- **Botão primary**: `background: --accent`, cor branca, hover `#7d56f3`
- **Botão secondary**: `background: rgba(255,255,255,0.06)`, cor `#d0d0d0`
- **Recentes**: header "RECENTES" (11px, uppercase, `--faint`), grid 3 colunas (`repeat(3, minmax(250px, 1fr))`)
- **Card recente**: border `--border`, background `--bg-elevated`, ícone + nome + diretório

### 5.4 Editor

- **Toolbar**: centralizada horizontalmente, 38px altura, `background: rgba(45,45,45,0.92)`, blur
- **Botões de formato**: 34×30px, cor `#c8cbd3`, hover/ativo `background: rgba(255,255,255,0.06)`
- **Separadores**: linha de 1px × 18px entre grupos de botões
- **Canvas**: width `min(720px, 100%)`, centralizado com `margin: 0 auto`
- **Scrollbar customizada**: 4px width, auto-hide 900ms, thumb `rgba(255,255,255,0.2)`
- **BlockNote**: theme `dark`, sem side menu/formatting toolbar/slash menu nativos (todos customizados)

### 5.5 StatusBar

- **Layout**: flex row, altura 30px, padding horizontal 16px, gap 22px
- **Itens**: status salvamento | tipo arquivo ("Markdown") | encoding ("UTF-8") | caminho
- **Caminho**: alinhado à direita (`margin-left: auto`), truncado com ellipsis
- **Background**: `#1e1e1e`, border-top `rgba(255,255,255,0.06)`

---

## 6. Funcionalidades Implementadas

### 6.1 Arquivos

| Funcionalidade | Atalho | Implementação |
|---|---|---|
| Criar novo | `Ctrl+N` | `createDocument()` → nova tab "Untitled.md" em branco |
| Abrir arquivo | `Ctrl+O` | `openDocument()` → file picker nativo, filtro `.md` |
| Abrir recente | clique | `openDocumentFromPath(path)` → card na Home |
| Salvar | `Ctrl+S` | `saveDocument()` → se sem path, abre dialog "Salvar como" |
| Salvar como | `Ctrl+Shift+S` | `saveDocumentAs()` → sempre abre dialog |
| Fechar tab | × na tab | `closeDocument(id)` → confirma descarte se isDirty |
| Exportar PDF | `Ctrl+P` | `exportMarkdownToPdf()` → gera e salva PDF |
| Abrir com OS | CLI arg | `get_initial_markdown_file_path()` → scan de args por `.md` |

### 6.2 Gerenciamento de Tabs

- Múltiplas tabs abertas simultaneamente
- Indicador de alterações não salvas (dirty dot roxo)
- Fechar tab individual com confirmação de descarte
- Alternar entre tabs mantendo estado de edição
- Ao fechar última tab, volta para Home
- Tabs sem path são "Untitled.md" até primeiro save

### 6.3 Editor Markdown (BlockNote)

- Edição visual WYSIWYG — Markdown → blocos → Markdown
- Conversão bidirecional: `tryParseMarkdownToBlocks()` / `blocksToMarkdownLossy()`
- Detecta conteúdo externo vs interno para evitar re-parse desnecessário
- Slash menu (`/`) com itens traduzidos para pt-BR
- Side menu customizado (botão deletar bloco + ação "Dividir")

### 6.4 Toolbar de Formatação

| Grupo | Botões |
|---|---|
| Texto | Negrito, Itálico, Tachado, Sublinhado |
| Código/Link | Código inline, Link (modal) |
| Cor | Popover com 10 cores de texto + 10 cores de fundo, botão "Remover cor" |
| Cabeçalhos | H1, H2, H3 |
| Blocos | Citação, Lista não-ordenada, Lista numerada, Checklist, Toggle list |
| Inserir | Bloco de código, Tabela, Imagem (modal drag & drop) |

### 6.5 Modais

- **Link**: campos URL (obrigatório) + Texto exibido (opcional), confirma com Enter
- **Imagem**: drag & drop zone + botão "Escolher arquivo", suporte a PNG/JPG/GIF/WebP
- Ambas fecham com Escape ou clique fora

### 6.6 Janela

- Titlebar customizada (sem decorações nativas)
- Minimizar, Maximizar, Fechar com ícones Lucide
- Interceptação de fechamento: confirma descarte de tabs não salvas
- `data-tauri-drag-region` para arrastar a janela

### 6.7 Arquivos Recentes

- Persistidos em `localStorage` (chave `draftly:recent-files`)
- Máximo de 9 itens, ordenados por `openedAt` decrescente
- Exibidos na Home em grid de 3 colunas
- Validação de schema na leitura do localStorage

### 6.8 Tratamento de Erros

- Banner de erro flutuante (posição absoluta abaixo da titlebar)
- Background `rgba(255,107,107,0.12)`, texto `#ffd0d0`
- Clicável para dispensar (`clearError()`)
- Erros comuns: arquivo não encontrado, extensão inválida, permissão negada

---

## 7. Backend Rust

### 7.1 Comandos Tauri

```rust
fn read_markdown_file(path: String) -> Result<String, String>
fn write_markdown_file(path: String, content: String) -> Result<(), String>
fn get_initial_markdown_file_path() -> Option<String>
```

### 7.2 Validação

- `ensure_markdown_path()` verifica extensão `.md` (case-insensitive)
- Erro em português: "Draftly v1 abre e salva apenas arquivos .md"
- Plugins: `tauri_plugin_dialog`

---

## 8. Otimizações de Build

### 8.1 Code Splitting (Vite)

```javascript
rollupOptions.manualChunks: {
  "vendor-radix": // todos os pacotes @radix-ui
  "vendor-tauri": // @tauri-apps/api + @tauri-apps/plugin-dialog
}
```

### 8.2 Lazy Loading

- `MarkdownEditor` e `StatusBar` carregados via `React.lazy()`
- `EditorLoading` como fallback durante Suspense

---

## 9. Idioma

Toda a UI está em **Português (Brasil)**: labels, tooltips, placeholders, mensagens de erro, diálogos, itens do menu slash, atalhos.

---

## 10. O Que NÃO Está Implementado (v1 MVP)

- Sidebar de navegação
- Command palette
- Suporte a JSON, código, CSV, YAML
- Múltiplos temas (apenas dark)
- Renomear/duplicar/pin de tabs
- Atalhos globais para criar, abrir e salvar como
- Autenticação ou sincronização
- Testes automatizados

---

## 11. Estrutura de Arquivos

```
src/
  main.tsx
  app/App.tsx
  contexts/
    WorkspaceContext.tsx
    TabsContext.tsx
    FileActionsContext.tsx
    index.ts
  components/
    layout/
      AppShell.tsx
      TitleBar.tsx
      FileTabs.tsx
      FileMenu.tsx
      WindowControls.tsx
      StatusBar.tsx
    home/
      Home.tsx
    editor/
      MarkdownEditor.tsx
      EditorToolbar.tsx
      Editor.lazy.tsx
      EditorLoading.tsx
      CustomSideMenu.tsx
      slashMenu.ts
    ui/
      IconButton.tsx
  lib/
    fs.ts
  styles/
    globals.css
    shell.css
    titlebar.css
    home.css
    editor.css
src-tauri/
  src/lib.rs
  tauri.conf.json
  icons/
```
