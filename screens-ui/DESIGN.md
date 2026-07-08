# DESIGN.md — Draftly

Documento de direção visual e experiência para gerar a UI no **Google Stitch** e usar depois como base do projeto.

---

## 1. Visão do Produto

**Draftly** é um app desktop minimalista, local-first, para abrir, criar, visualizar e editar arquivos de texto, Markdown, JSON e código.

A proposta é unir:

- **Obsidian** para organização local, sidebar e notas.
- **Notion** para escrita visual e edição direta no preview.
- **Confluence** para documentação técnica bem formatada.
- **VSCode** para tabs, command palette, atalhos e edição de código.
- **Linear/Vercel** para minimalismo, refinamento visual e sensação premium.

### Frase do Produto

> Um editor minimalista para Markdown, JSON e código, com leitura bonita, edição rápida e formatação automática.

---

## 2. Objetivo da UI

Criar uma interface desktop escura, limpa e produtiva, com foco em:

- escrita sem distração;
- leitura confortável;
- abertura rápida de arquivos;
- edição visual de Markdown;
- formatação automática para JSON e código;
- navegação por tabs;
- command palette;
- configurações simples;
- estética premium e minimalista.

O app deve parecer um produto real, moderno, leve e pronto para uso diário.

---

## 3. Personalidade Visual

A interface deve transmitir:

- calma;
- foco;
- organização;
- precisão técnica;
- minimalismo;
- produtividade;
- confiança.

### Referências Visuais

- Obsidian
- Notion
- Confluence
- VSCode
- Linear
- Vercel
- Raycast

### Evitar

- visual neon;
- cyberpunk;
- glassmorphism exagerado;
- gradientes fortes;
- interface muito colorida;
- dashboard genérico;
- excesso de sombras;
- botões grandes demais;
- aparência infantil;
- layout mobile-first;
- excesso de elementos na tela.

---

## 4. Design Principles

### 4.1 Minimalismo Funcional

A interface deve mostrar apenas o necessário para o contexto atual.

Exemplo:

- Markdown mostra ferramentas de escrita.
- JSON mostra ações de formatação e validação.
- Código mostra linguagem, linha, coluna e formatar.
- Home mostra arquivos recentes e ações rápidas.

---

### 4.2 Cada Arquivo com Sua Melhor Experiência

O Draftly não deve abrir tudo como texto cru.

| Tipo de arquivo | Experiência ideal |
|---|---|
| `.md` | Documento visual editável |
| `.json` | Editor técnico com formatador e validação |
| `.txt` | Leitura/escrita simples |
| `.js`, `.ts`, `.tsx`, `.py`, `.html`, `.css` | Editor de código leve |
| `.csv` | Futuro modo tabela |
| `.yaml`, `.yml`, `.toml` | Editor técnico formatável |

---

### 4.3 Markdown Visual por Padrão

Markdown deve abrir primeiro como documento bonito e editável, não como código.

O usuário deve conseguir clicar no preview e editar diretamente, mantendo o arquivo salvo como Markdown real.

---

### 4.4 Interface Desktop Premium

O layout deve se comportar como app desktop:

- sidebar fixa;
- tabs no topo;
- área de edição central;
- status bar inferior;
- atalhos;
- command palette;
- modais de configuração;
- múltiplos arquivos abertos.

---

## 5. Layout Geral

Estrutura base:

```txt
┌────────────────────────────────────────────────────────────┐
│ Titlebar / Topbar / Tabs                                   │
├──────┬─────────────────────────────────────────────────────┤
│ Side │ Main Content / Editor                               │
│ bar  │                                                     │
├──────┴─────────────────────────────────────────────────────┤
│ Status Bar                                                 │
└────────────────────────────────────────────────────────────┘
```

### Áreas principais

1. **Sidebar**
   - navegação por ícones;
   - home;
   - busca;
   - arquivos recentes;
   - templates;
   - configurações.

2. **Topbar / Tabs**
   - arquivos abertos;
   - botão para nova aba;
   - estado ativo;
   - nome do arquivo;
   - fechamento da aba.

3. **Main Area**
   - home;
   - editor Markdown;
   - editor JSON;
   - editor de código;
   - configurações;
   - command palette.

4. **Status Bar**
   - estado de salvamento;
   - tipo do arquivo;
   - linha e coluna;
   - encoding;
   - modo de visualização;
   - contagem de palavras quando for Markdown.

---

## 6. Design Tokens

### 6.1 Cores

```css
:root {
  --bg: #0f1115;
  --bg-elevated: #111318;

  --surface: #15171c;
  --surface-soft: #191c22;
  --surface-hover: #1b1e25;
  --surface-active: #20242d;

  --border: #262a33;
  --border-soft: #1f232b;

  --text: #e6e8ee;
  --text-muted: #9ca3af;
  --text-subtle: #6b7280;
  --text-disabled: #4b5563;

  --accent: #3b82f6;
  --accent-hover: #60a5fa;
  --accent-soft: rgba(59, 130, 246, 0.14);
  --accent-border: rgba(59, 130, 246, 0.35);

  --success: #22c55e;
  --success-soft: rgba(34, 197, 94, 0.12);

  --warning: #f59e0b;
  --warning-soft: rgba(245, 158, 11, 0.12);

  --danger: #ef4444;
  --danger-soft: rgba(239, 68, 68, 0.12);
}
```

---

### 6.2 Tema Escuro

O tema padrão deve ser escuro.

Características:

- fundo quase preto;
- cards em cinza escuro;
- bordas finas;
- botões discretos;
- azul como cor de destaque;
- texto branco suave, sem branco puro agressivo.

---

### 6.3 Tema Claro

O tema claro deve existir, mas não precisa ser o foco visual inicial.

```css
.light {
  --bg: #f7f8fa;
  --surface: #ffffff;
  --surface-hover: #f1f5f9;
  --border: #e5e7eb;
  --text: #111827;
  --text-muted: #6b7280;
  --accent: #2563eb;
}
```

---

### 6.4 Tipografia

Usar uma fonte moderna, limpa e boa para leitura.

Sugestões:

- Inter
- SF Pro
- Geist
- IBM Plex Sans
- Segoe UI

Para editor de código:

- JetBrains Mono
- Cascadia Code
- Fira Code
- Consolas

```css
--font-sans: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--font-mono: "JetBrains Mono", "Cascadia Code", Consolas, monospace;
```

### Escala de texto

```css
--text-xs: 12px;
--text-sm: 13px;
--text-md: 14px;
--text-lg: 16px;
--text-xl: 20px;
--text-2xl: 28px;
--text-3xl: 36px;
```

---

### 6.5 Espaçamento

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
```

---

### 6.6 Bordas

```css
--radius-sm: 6px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-xl: 16px;
--radius-full: 999px;
```

Preferência visual:

- cards: `12px`;
- botões: `8px`;
- modais: `14px`;
- inputs: `8px`;
- tabs: `8px`.

---

### 6.7 Sombras

Sombras devem ser sutis.

```css
--shadow-soft: 0 8px 30px rgba(0, 0, 0, 0.24);
--shadow-modal: 0 24px 80px rgba(0, 0, 0, 0.45);
```

---

## 7. Componentes Base

### 7.1 Button

Variações:

- `primary`
- `secondary`
- `ghost`
- `danger`

Estados:

- default;
- hover;
- active;
- disabled;
- loading.

Exemplo visual:

```txt
[ Abrir arquivo ]   [ Novo arquivo ]   [ Abrir pasta ]
```

---

### 7.2 IconButton

Usado na sidebar, tabs e ações rápidas.

Características:

- quadrado;
- 32x32 ou 36x36;
- borda sutil no hover;
- fundo ativo com accent soft.

---

### 7.3 Sidebar

Sidebar fina, estilo Obsidian/VSCode.

Largura sugerida:

```txt
56px
```

Itens:

- Home
- Buscar
- Recentes
- Templates
- Configurações

Visual:

- ícones centralizados;
- item ativo com fundo azul suave;
- tooltip no hover;
- separadores discretos.

---

### 7.4 Topbar / Tabs

A barra superior deve ter:

- tabs abertas;
- botão de nova aba;
- nome do arquivo;
- ícone do tipo de arquivo;
- botão fechar;
- estado ativo.

Exemplo:

```txt
[ Markdown.md  x ] [ JSON.json x ] [ + ]
```

Tab ativa:

- fundo mais claro;
- borda inferior ou destaque azul sutil;
- texto mais forte.

---

### 7.5 StatusBar

Barra inferior discreta.

Informações:

- estado de salvamento;
- linha e coluna;
- tipo do arquivo;
- modo de visualização;
- encoding;
- final de linha;
- contagem de palavras.

Exemplo:

```txt
Ln 12, Col 4    120%    markdown    CRLF    UTF-8    Salvo
```

---

### 7.6 FileCard

Card de arquivo recente.

Conteúdo:

- ícone do tipo;
- nome do arquivo;
- caminho curto;
- tipo;
- data de edição.

Exemplo:

```txt
┌─────────────────────────────┐
│ README.md                   │
│ ~/Projetos/Draftly/README.md│
│ Markdown · Editado hoje     │
└─────────────────────────────┘
```

Estados:

- hover com borda azul suave;
- foco acessível;
- clique abre arquivo.

---

### 7.7 FloatingToolbar

Toolbar flutuante para Markdown.

Aparece ao selecionar texto.

Ações:

- negrito;
- itálico;
- riscado;
- inline code;
- link;
- heading;
- quote;
- bullet list;
- numbered list;
- checklist.

Visual:

- fundo escuro elevado;
- bordas arredondadas;
- sombra suave;
- ícones pequenos;
- separadores discretos.

---

### 7.8 CommandPalette

Modal central, estilo VSCode/Raycast/Obsidian.

Atalho:

```txt
Ctrl + P
```

Componentes:

- input de busca;
- lista de comandos;
- ícone;
- nome;
- atalho;
- categoria.

Exemplo:

```txt
Type a command or file name

New Markdown document
New text document
Open file
Save
Format document
Toggle preview
Open settings
```

Visual:

- largura entre 620px e 720px;
- topo centralizado;
- sombra forte mas elegante;
- fundo `surface`;
- border `border`;
- cantos `14px`.

---

### 7.9 SettingsModal

Modal de configurações com menu lateral.

Categorias:

- Geral
- Aparência
- Editor
- Markdown
- JSON
- Arquivos

Layout:

```txt
┌─────────────────────────────────────────────┐
│ Configurações                            X  │
├───────────────┬─────────────────────────────┤
│ Geral         │ Configurações gerais        │
│ Aparência     │                             │
│ Editor        │ Campo / Switch / Select     │
│ Markdown      │                             │
│ JSON          │                             │
│ Arquivos      │                             │
└───────────────┴─────────────────────────────┘
```

---

### 7.10 Inputs, Selects e Switches

Devem ser compactos e discretos.

Características:

- altura de 32px a 36px;
- fundo escuro;
- borda sutil;
- foco azul;
- label clara;
- descrição opcional em texto muted.

---

## 8. Telas Principais

---

## 8.1 Home

### Objetivo

Ser uma tela inicial rápida para abrir arquivos, criar documentos e acessar recentes.

### Elementos

- título `Draftly`;
- subtítulo;
- botões principais;
- grid de arquivos recentes;
- opção de abrir pasta;
- estado vazio caso não tenha arquivos.

### Layout sugerido

```txt
                       Draftly
      Editor minimalista para Markdown, JSON e código

       [ Abrir arquivo ] [ Novo arquivo ] [ Abrir pasta ]

                       Arquivos recentes

      ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
      │ README.md     │ │ config.json   │ │ notes.txt     │
      │ Markdown      │ │ JSON          │ │ Texto         │
      └───────────────┘ └───────────────┘ └───────────────┘
```

### Direção visual

- conteúdo centralizado;
- largura máxima de 900px;
- cards em grid;
- botões pequenos/médios;
- bastante respiro.

---

## 8.2 Markdown Visual Editor

### Objetivo

Editar Markdown como documento visual bonito, no estilo Notion/Obsidian/Confluence.

### Deve mostrar

- página centralizada;
- título grande;
- headings;
- parágrafos;
- listas;
- checklists;
- links;
- callouts;
- code blocks;
- tabelas;
- toolbar flutuante;
- status bar.

### Layout

```txt
┌─────────────────────────────────────────────┐
│ Minha Nota.md                         Salvo │
├─────────────────────────────────────────────┤
│                                             │
│           Título do Documento               │
│           Texto introdutório...             │
│                                             │
│           ## Seção                          │
│           - Item importante                 │
│           - Outro item                      │
│                                             │
│           > Callout informativo             │
│                                             │
└─────────────────────────────────────────────┘
```

### Comportamento esperado

- abrir `.md` em modo visual por padrão;
- clicar no texto para editar;
- usar Markdown real por baixo;
- salvar como `.md`;
- permitir alternar para source/split.

---

## 8.3 Markdown Split Editor

### Objetivo

Permitir edição Markdown source + preview renderizado.

### Layout

```txt
┌─────────────────────────────┬─────────────────────────────┐
│ Markdown Source             │ Preview                     │
├─────────────────────────────┼─────────────────────────────┤
│ # Draftly                   │ Draftly                     │
│                             │ Editor minimalista...       │
│ - item                      │ • item                      │
└─────────────────────────────┴─────────────────────────────┘
```

### Requisitos visuais

- divisor vertical sutil;
- editor source com fonte mono;
- preview com fonte sans;
- scroll independente;
- botão para alternar modo.

---

## 8.4 JSON Editor

### Objetivo

Editar JSON com validação, autoformatação e leitura clara.

### Elementos

- editor com linhas;
- syntax highlight;
- botões superiores;
- badge de status;
- ações rápidas;
- status bar.

### Ações

- Formatar;
- Minificar;
- Validar;
- Copiar;
- Ordenar chaves;
- Expandir/colapsar no futuro.

### Layout

```txt
┌────────────────────────────────────────────────────────────┐
│ JSON.json      JSON válido     [Formatar] [Validar] [Copiar]│
├────────────────────────────────────────────────────────────┤
│ 1  {                                                       │
│ 2    "name": "Draftly",                                   │
│ 3    "theme": "dark",                                     │
│ 4    "autoSave": true                                     │
│ 5  }                                                       │
└────────────────────────────────────────────────────────────┘
```

---

## 8.5 Code Editor

### Objetivo

Abrir código de forma leve, limpa e útil.

### Suporte inicial

- JavaScript;
- TypeScript;
- TSX;
- JSX;
- HTML;
- CSS;
- Python;
- YAML;
- ENV;
- TXT.

### Elementos

- syntax highlight;
- numeração de linhas;
- indentação;
- botão formatar;
- botão abrir no VSCode;
- status de linguagem;
- linha e coluna.

### Layout

```txt
┌────────────────────────────────────────────────────────────┐
│ app.tsx     TypeScript React     [Formatar] [Abrir VSCode]│
├────────────────────────────────────────────────────────────┤
│ 1  export function App() {                                │
│ 2    return <main>Draftly</main>                          │
│ 3  }                                                       │
└────────────────────────────────────────────────────────────┘
```

---

## 8.6 Settings

### Geral

Campos:

- idioma;
- iniciar no editor;
- restaurar sessão ao abrir;
- mostrar arquivos recentes;
- confirmar antes de sair.

### Aparência

Campos:

- tema;
- cor de destaque;
- mostrar abas;
- densidade da interface;
- arredondamento;
- transparência da barra lateral.

### Editor

Campos:

- fonte;
- tamanho da fonte;
- números de linha;
- quebra de linha;
- destaque da linha atual;
- barra de status;
- zoom padrão.

### Markdown

Campos:

- abrir Markdown como Visual, Source ou Split;
- habilitar toolbar flutuante;
- habilitar slash commands;
- renderizar callouts;
- mostrar sumário lateral.

### JSON

Campos:

- formatar ao salvar;
- validar automaticamente;
- indentação;
- ordenar chaves;
- permitir comentários em JSONC.

### Arquivos

Campos:

- salvar automaticamente;
- pedir confirmação antes de salvar;
- diretório padrão de imagens;
- diretório padrão de notas;
- extensões suportadas.

---

## 9. Fluxos de Uso

---

### 9.1 Abrir Markdown

```txt
Usuário abre Draftly
Clica em Abrir arquivo
Seleciona README.md
Draftly detecta Markdown
Abre em modo Visual
Usuário edita no preview
Draftly salva automaticamente ou manualmente
Status muda para Salvo
```

---

### 9.2 Criar Markdown

```txt
Usuário clica em Novo arquivo
Seleciona Markdown
Escolhe template opcional
Começa a escrever em modo visual
Salva como .md
Arquivo entra nos recentes
```

---

### 9.3 Abrir JSON

```txt
Usuário abre config.json
Draftly detecta JSON
Mostra editor técnico
Valida automaticamente
Se estiver inválido, mostra erro discreto
Usuário clica em Formatar
Salva arquivo
```

---

### 9.4 Abrir Código

```txt
Usuário abre app.tsx
Draftly detecta TypeScript React
Abre editor com syntax highlight
Usuário edita
Pode formatar
Pode abrir no VSCode
Salva arquivo
```

---

### 9.5 Usar Command Palette

```txt
Usuário aperta Ctrl + P
Command palette abre no centro
Usuário digita "format"
Seleciona "Formatar documento"
Ação é executada
Modal fecha
```

---

## 10. Modos de Editor

### Markdown

- Visual
- Source
- Split
- Focus

### JSON

- Edit
- Formatted
- Minified
- Readonly

### Code

- Edit
- Readonly
- Focus

---

## 11. Estados Importantes

### Arquivo salvo

Mostrar na status bar:

```txt
Salvo
```

### Arquivo com alterações

Mostrar:

```txt
Não salvo
```

ou um ponto na tab:

```txt
README.md •
```

### JSON inválido

Mostrar badge:

```txt
JSON inválido
```

Com mensagem discreta:

```txt
Erro na linha 8: vírgula inesperada.
```

### Arquivo não suportado

Mostrar tela simples:

```txt
Este tipo de arquivo ainda não tem preview especial.
Abrir como texto simples?
```

### Sem arquivos recentes

Mostrar empty state:

```txt
Nenhum arquivo recente.
Abra um arquivo para começar.
```

---

## 12. Microinterações

- Hover sutil em cards;
- tabs com transição curta;
- botões com feedback visual;
- command palette abrindo com leve escala/opacidade;
- status `Salvo` aparece suavemente;
- toolbar flutuante aparece ao selecionar texto;
- foco de input com borda azul;
- sidebar com tooltip.

Transições:

```css
transition: 120ms ease;
```

Evitar animações longas.

---

## 13. Acessibilidade

A interface deve ter:

- contraste suficiente;
- navegação por teclado;
- foco visível;
- atalhos;
- labels em inputs;
- tooltips em ícones;
- tamanho de clique mínimo de 32px;
- não depender apenas de cor para estados críticos.

---

## 14. Atalhos

```txt
Ctrl + O              Abrir arquivo
Ctrl + N              Novo arquivo
Ctrl + S              Salvar
Ctrl + Shift + S      Salvar como
Ctrl + P              Command palette
Ctrl + F              Buscar no documento
Ctrl + Shift + F      Formatar documento
Ctrl + E              Alternar visual/source
Ctrl + \              Split view
Ctrl + W              Fechar aba
Ctrl + Tab            Próxima aba
Ctrl + ,              Configurações
```

---

## 15. Estrutura de Componentes para o Projeto

```txt
src/
  app/
    App.tsx
    providers/

  core/
    files/
      fileService.ts
      fileTypes.ts
      recentFiles.ts
      autoSave.ts

    editor/
      editorRegistry.ts
      detectFileKind.ts
      formatDocument.ts

    commands/
      commandRegistry.ts
      commands.ts

    settings/
      settingsStore.ts
      defaultSettings.ts

  features/
    home/
      HomeScreen.tsx
      RecentFileCard.tsx

    editor-shell/
      EditorShell.tsx
      Sidebar.tsx
      TabBar.tsx
      StatusBar.tsx

    markdown/
      MarkdownVisualEditor.tsx
      MarkdownSplitEditor.tsx
      MarkdownSourceEditor.tsx
      FloatingToolbar.tsx

    json/
      JsonEditor.tsx
      JsonActions.tsx

    code/
      CodeEditor.tsx
      CodeActions.tsx

    command-palette/
      CommandPalette.tsx

    settings/
      SettingsModal.tsx
      GeneralSettings.tsx
      AppearanceSettings.tsx
      EditorSettings.tsx
      MarkdownSettings.tsx
      JsonSettings.tsx
      FileSettings.tsx

  shared/
    components/
      Button.tsx
      IconButton.tsx
      Input.tsx
      Select.tsx
      Switch.tsx
      Badge.tsx
      Modal.tsx
      Tooltip.tsx

    styles/
      tokens.css
      globals.css

    utils/
      cn.ts
      shortcuts.ts
```

---

## 16. Prompt para Google Stitch

Use este prompt para gerar a UI:

```txt
Create a premium dark-mode desktop app UI called Draftly.

Draftly is a minimalist local-first editor for Markdown, JSON, TXT and code files. The design should blend Obsidian, Notion, Confluence, VSCode, Linear and Vercel.

The interface should feel like a real polished desktop productivity app: calm, technical, minimal, elegant and focused on writing and file editing.

Use a dark refined visual style:
- near-black background
- dark gray surfaces
- subtle borders
- soft blue accent color
- rounded corners
- clean typography
- generous spacing
- minimal shadows
- professional desktop app feeling

Create these screens and states:

1. Home screen:
- centered welcome area
- title "Draftly"
- subtitle "Minimal editor for Markdown, JSON and code"
- primary buttons: Open file, New file, Open folder
- recent files grid with cards showing filename, path, type and last edited date

2. Visual Markdown editor:
- opens Markdown as an editable rendered document by default
- looks like Notion + Obsidian reading view + Confluence documentation
- centered page with comfortable width
- title, paragraphs, headings, checklists, callouts, code blocks and links
- floating formatting toolbar
- top tabs and bottom status bar

3. Split Markdown editor:
- left side markdown source
- right side rendered preview
- subtle vertical divider
- source code with monospaced font and syntax highlight
- preview with beautiful document styling

4. JSON editor:
- technical but clean
- line numbers
- syntax highlighting
- top action buttons: Format, Minify, Validate, Copy
- badge showing "Valid JSON"
- VSCode-inspired but more minimal

5. Code editor:
- syntax highlighted code area
- line numbers
- top actions: Format and Open in VSCode
- bottom status bar showing language, line, column, encoding

6. Command palette:
- centered modal inspired by VSCode, Obsidian and Raycast
- search input at the top
- command list with icons and shortcuts
- commands like New Markdown, Open File, Save, Format Document, Toggle Preview, Open Settings

7. Settings modal:
- sidebar with categories General, Appearance, Editor, Markdown, JSON and Files
- clean form controls with switches, selects and inputs
- dark theme, subtle borders, rounded corners

General layout:
- thin icon sidebar on the left
- top tab bar
- main editor area
- bottom status bar
- desktop-first design

Avoid:
- neon colors
- cyberpunk style
- heavy gradients
- excessive glassmorphism
- childish icons
- cluttered dashboard layout
- mobile app layout
- overly colorful UI
```

---

## 17. Critérios de Aceite Visual

A UI gerada deve atender estes pontos:

- parece um app desktop real;
- tem tema escuro premium;
- possui sidebar fina;
- possui tabs no topo;
- possui status bar inferior;
- Markdown parece documento bonito, não código cru;
- JSON parece técnico e formatável;
- código parece leve e limpo;
- command palette parece VSCode/Raycast;
- settings parece Obsidian mais polido;
- não parece dashboard genérico;
- não parece landing page;
- não parece app mobile;
- usa poucos elementos coloridos;
- tem bom espaçamento;
- tem hierarquia visual clara.

---

## 18. MVP Visual

Para primeira versão, priorizar:

```txt
Home
Editor Markdown Visual
Editor Markdown Split
Editor JSON
Editor de Código
Command Palette
Settings Modal
Sidebar
Tabs
Status Bar
```

---

## 19. Identidade Final

O Draftly deve parecer:

```txt
Minimalista como Linear
Local como Obsidian
Bonito como Notion
Técnico como VSCode
Organizado como Confluence
Rápido como Sublime
```

O diferencial principal:

> Cada arquivo abre na experiência ideal para ele.
