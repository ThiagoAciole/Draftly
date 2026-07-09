# AGENTS.md

This file provides guidance to Claude Code and AI agents when working with this repository.

## Project Overview

Draftly is a Tauri v2 desktop Markdown editor — minimalist, local-first, dark-themed. v1 MVP handles only `.md` files. Uses a visual (WYSIWYG) editing approach via BlockNote with a custom titlebar, tab management, and a home screen with recent files.

## Commands

```bash
npm run dev          # Vite dev server on port 1420 (HMR on 1421)
npm run build        # TypeScript check + Vite production build
npm run tauri:dev    # Tauri dev (opens desktop window, runs Vite in background)
npm run tauri:build  # Tauri production desktop build
```

There are no tests yet.

## Architecture

### Tech Stack

- **Frontend**: React 18, TypeScript, Vite 6
- **Desktop shell**: Tauri v2 (Rust)
- **State management**: React Context API — 3 domain contexts (see below)
- **Editor**: BlockNote (`@blocknote/react` + `@blocknote/mantine`) — block-based rich text editing, converts to/from Markdown
- **UI primitives**: Radix UI (dropdown-menu, tooltip), Lucide React icons
- **Styling**: Custom CSS per component group (`globals.css`, `shell.css`, `titlebar.css`, `home.css`, `editor.css`)

### File Structure

```
src/
  main.tsx                  # Entry point, mounts <App />
  app/App.tsx               # Root component — nests 3 context providers, renders <AppShell />
  contexts/
    WorkspaceContext.tsx     # UI state: view ("home"|"editor"), isBusy, error
    TabsContext.tsx          # Document state: tabs[], activeTabId, recentFiles + tab CRUD
    FileActionsContext.tsx   # Async operations: open, save, create, close (calls lib/fs.ts)
    index.ts                 # Re-exports all providers and hooks
  components/
    layout/AppShell.tsx      # Top-level shell — consumes all 3 contexts, renders Home or Editor
    layout/TitleBar.tsx      # Custom titlebar (decorations: false) — FileTabs + FileMenu + WindowControls
    layout/FileTabs.tsx      # Tab bar — uses useTabsContext + useFileActions
    layout/FileMenu.tsx      # Radix dropdown: New, Open, Save, Save As, Export PDF — uses useFileActions
    layout/WindowControls.tsx # Min/Max/Close buttons, intercepts close with unsaved-changes check
    layout/StatusBar.tsx     # Shows save status, file type, encoding, file path — uses useTabsContext
    home/Home.tsx            # Home screen — pure component, receives all data/handlers as props
    editor/MarkdownEditor.tsx # BlockNote visual Markdown editor with custom scrollbar
    editor/EditorToolbar.tsx  # Formatting toolbar: bold, italic, headings, links, code, images, colors, etc.
    editor/Editor.lazy.tsx   # React.lazy() wrappers for MarkdownEditor and StatusBar
    editor/EditorLoading.tsx  # Suspense fallback while editor loads
    editor/CustomSideMenu.tsx # Custom BlockNote side menu with delete + divider actions
    editor/slashMenu.ts       # Slash menu items translated to Portuguese
    ui/IconButton.tsx        # Icon button with Radix tooltip
  lib/fs.ts                  # File I/O layer — only file that calls Tauri invoke()
  styles/                    # CSS files
```

### Context Architecture

There are exactly **3 contexts**. Use the right hook for each job:

| Context              | Hook               | Owns                                                                                                                                                                            |
| -------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `WorkspaceContext`   | `useWorkspace()`   | `view`, `isBusy`, `error`, `clearError`, `setView`, `setIsBusy`, `setError`                                                                                                     |
| `TabsContext`        | `useTabsContext()` | `tabs[]`, `activeTab`, `tabsMeta`, `activeTabId`, `recentFiles`, `updateActiveMarkdown`, `switchTab`, `replaceTab`, `addTab`, `createBlankTab`, `closeTabById`, `addRecentFile` |
| `FileActionsContext` | `useFileActions()` | `initializeWorkspace`, `createDocument`, `openDocument`, `openDocumentFromPath`, `saveDocument`, `saveDocumentAs`, `closeDocument`, `canCloseApp`                               |

**Provider nesting order in `App.tsx`** (outermost first):

1. `WorkspaceProvider`
2. `TabsProvider` — consumes WorkspaceContext
3. `FileActionsProvider` — consumes WorkspaceContext + TabsContext

**Rule:** Components never import from `src/state/`. All state comes from `src/contexts/`.

### Rust Backend (`src-tauri/src/lib.rs`)

Three Tauri commands:

- `read_markdown_file(path)` — reads a `.md` file, validates `.md` extension
- `write_markdown_file(path, content)` — writes content, validates `.md` extension
- `get_initial_markdown_file_path()` — scans CLI args for a `.md` path ("Open with" OS integration)

The `.md` extension check is enforced server-side in Rust. Non-`.md` files are rejected with a Portuguese error message.

**Rule:** Only `src/lib/fs.ts` calls `invoke()`. Context files import from `lib/fs.ts`, not from `@tauri-apps/api/core` directly.

### File I/O Layer (`src/lib/fs.ts`)

All Tauri IPC calls are isolated here. Public API:

| Function                              | Returns                         | Description                 |
| ------------------------------------- | ------------------------------- | --------------------------- |
| `readMarkdownFile(path)`              | `Promise<MarkdownFile>`         | Read file content via Tauri |
| `openMarkdownFile()`                  | `Promise<MarkdownFile \| null>` | Native file picker          |
| `pickMarkdownSavePath(defaultPath?)`  | `Promise<string \| null>`       | Native save dialog          |
| `saveMarkdownFile(path, content)`     | `Promise<void>`                 | Write file via Tauri        |
| `getInitialMarkdownFilePath()`        | `Promise<string \| null>`       | CLI arg scan                |
| `getFileName(path)`                   | `string`                        | Extract filename from path  |
| `exportMarkdownToPdf(name, markdown)` | `void`                          | Opens print window          |

### Editor Details

The `MarkdownEditor` component wraps BlockNote:

- Uses `tryParseMarkdownToBlocks()` to convert markdown string → BlockNote blocks on external content change
- Uses `blocksToMarkdownLossy()` to convert blocks → markdown string on internal edit
- Tracks `externalMarkdown` ref to avoid re-parsing content that originated from the editor itself
- Ctrl+S / Cmd+S keyboard shortcut for save (calls `onSave` prop)
- Custom scrollbar: draggable thumb that auto-hides after 900ms of inactivity
- `ResizeObserver` keeps scrollbar dimensions in sync with content changes

### Window Management

- `tauri.conf.json`: `decorations: false` — the app draws its own titlebar
- `WindowControls` registers `onCloseRequested` to intercept window close, calls `canCloseApp()` from `useFileActions()` which shows a discard-unsaved dialog via `@tauri-apps/plugin-dialog`
- Min size: 860×560, default: 1088×704

### Vite Build

Manual code-splitting via `rollupOptions.manualChunks`:

- `vendor-radix` — all Radix UI packages
- `vendor-tauri` — `@tauri-apps/api` + `@tauri-apps/plugin-dialog`

### UI Language

The app UI is in **Portuguese (Brazilian)** — all labels, tooltips, error messages, and dialogs.

## Where to Make Changes

| I want to...                                    | Touch this file                                                   |
| ----------------------------------------------- | ----------------------------------------------------------------- |
| Change view routing logic (home ↔ editor)       | `WorkspaceContext.tsx`                                            |
| Add a new tab action (rename, duplicate, pin)   | `TabsContext.tsx`                                                 |
| Add a new file operation (export, print, share) | `FileActionsContext.tsx` + `lib/fs.ts`                            |
| Change the formatting toolbar                   | `EditorToolbar.tsx`                                               |
| Change the slash menu items                     | `slashMenu.ts`                                                    |
| Change the home screen layout                   | `Home.tsx` + `home.css`                                           |
| Change tab appearance or behavior               | `FileTabs.tsx` + `titlebar.css`                                   |
| Change status bar information                   | `StatusBar.tsx`                                                   |
| Change Tauri backend commands                   | `src-tauri/src/lib.rs`                                            |
| Change the file picker/dialog behavior          | `lib/fs.ts`                                                       |
| Add a new Rust command                          | `src-tauri/src/lib.rs` → `lib/fs.ts` (wrapper) → relevant context |
| Add new CSS variables / design tokens           | `globals.css`                                                     |
| Change window size, titlebar, or decorations    | `src-tauri/tauri.conf.json`                                       |

## Design Reference

`screens-ui/DESIGN.md` contains the full product design spec — design tokens (colors, typography, spacing), component specifications, screen layouts, and the long-term vision (JSON editor, code editor, command palette, settings modal, multi-file-type support). The v1 MVP implements the Markdown Visual Editor and Home screen only.
