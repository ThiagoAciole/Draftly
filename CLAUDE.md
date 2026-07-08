# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Draftly is a Tauri v2 desktop Markdown editor — minimalist, local-first, dark-themed. The v1 MVP only handles `.md` files. It uses a visual (WYSIWYG) editing approach via BlockNote with a custom titlebar, tab management, and a home screen with recent files.

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
- **State management**: Zustand (single store in `src/state/documentStore.ts`)
- **Editor**: BlockNote (`@blocknote/react` + `@blocknote/mantine`) — block-based rich text editing, converts to/from Markdown
- **UI primitives**: Radix UI (dropdown-menu, dialog, tooltip, separator), Lucide React icons
- **Styling**: Custom CSS per component group (`globals.css`, `shell.css`, `titlebar.css`, `home.css`, `editor.css`)

### File Structure

```
src/
  main.tsx                  # Entry point, mounts <App />
  app/App.tsx               # Root component, renders <AppShell />
  components/
    layout/AppShell.tsx      # Top-level shell — renders Home or Editor based on state
    layout/TitleBar.tsx      # Custom titlebar (decorations: false) — FileTabs + FileMenu + WindowControls
    layout/FileTabs.tsx      # Tab bar with active/inactive states and close buttons
    layout/FileMenu.tsx      # Radix dropdown: New, Open, Save, Save As
    layout/WindowControls.tsx # Min/Max/Close buttons, intercepts close with unsaved-changes check
    layout/StatusBar.tsx     # Shows save status, file type, encoding, file path
    home/Home.tsx            # Home screen with "Open file" / "New file" buttons + recent files list
    editor/MarkdownEditor.tsx # BlockNote visual Markdown editor with custom scrollbar
    editor/EditorToolbar.tsx  # Formatting toolbar: bold, italic, headings, links, code, etc.
    editor/Editor.lazy.tsx   # React.lazy() wrappers for MarkdownEditor and StatusBar
    editor/EditorLoading.tsx  # Suspense fallback while editor loads
    ui/IconButton.tsx        # Icon button with Radix tooltip
  state/documentStore.ts     # Single Zustand store: tabs, active tab, recent files, all actions
  lib/fs.ts                  # File I/O layer — wraps Tauri invoke() calls
  styles/                    # CSS files
```

### Rust Backend (`src-tauri/src/lib.rs`)

Three Tauri commands:
- `read_markdown_file(path)` — reads a `.md` file, validates extension is `.md`
- `write_markdown_file(path, content)` — writes content, validates extension is `.md`
- `get_initial_markdown_file_path()` — scans CLI args for a `.md` path (for "Open with" OS integration)

The `.md` extension check is enforced server-side in Rust. Non-md files are rejected with a Portuguese error message.

### State Management

The Zustand store (`documentStore.ts`) is the central nervous system:
- `tabs: DocumentTab[]` — all open documents (each has id, path, name, markdown content, isDirty, lastSavedAt)
- `activeTabId` — currently focused tab
- `view: "home" | "editor"` — switches between home screen and editor
- `recentFiles` — persisted to `localStorage` under key `draftly:recent-files`, max 9 entries
- `isBusy` / `error` — loading and error states

Key behaviors:
- Opening a file that's already open switches to its existing tab (no duplicates)
- Closing the last tab returns to the home screen
- Unsaved changes prompt a confirmation dialog before closing tabs or the app
- `canCloseApp()` is called by `WindowControls` before allowing the window to close

### Editor Details

The `MarkdownEditor` component wraps BlockNote:
- Uses `tryParseMarkdownToBlocks()` to convert markdown string → BlockNote blocks
- Uses `blocksToMarkdownLossy()` to convert blocks → markdown string
- Tracks `externalMarkdown` ref to avoid re-parsing content that originated from the editor itself
- Ctrl+S / Cmd+S keyboard shortcut for save
- Custom scrollbar: a draggable thumb that auto-hides after 900ms of inactivity
- ResizeObserver keeps scrollbar dimensions in sync with content changes

### Window Management

- `tauri.conf.json`: `decorations: false` — the app draws its own titlebar
- `WindowControls` registers `onCloseRequested` to intercept window close, calls `canCloseApp()` which shows a discard-unsaved dialog via `@tauri-apps/plugin-dialog`
- Min size: 860×560, default: 1088×704
- CSP is `null` (no restrictions)

### Vite Build

Manual code-splitting via `rollupOptions.manualChunks`:
- `vendor-radix` — all Radix UI packages
- `vendor-tauri` — `@tauri-apps/api` + `@tauri-apps/plugin-dialog`

### UI Language

The app UI is in **Portuguese (Brazilian)** — all labels, tooltips, error messages, and dialogs.

## Design Reference

`screens-ui/DESIGN.md` contains the full product design spec — design tokens (colors, typography, spacing), component specifications, screen layouts, and the long-term vision (JSON editor, code editor, command palette, settings modal, multi-file-type support). The v1 MVP implements the Markdown Visual Editor and Home screen only.
