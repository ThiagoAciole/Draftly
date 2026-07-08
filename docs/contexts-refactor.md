# Contexts Refactor + CLAUDE.md Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the monolithic Zustand `documentStore.ts` with three domain-scoped React Contexts (`TabsContext`, `WorkspaceContext`, `FileActionsContext`), reorganize the codebase for maximum AI-agent readability, and rewrite `CLAUDE.md` to reflect the new architecture precisely.

**Architecture:** Three nested React Context providers supply state down the tree. `WorkspaceContext` owns UI-only state (`view`, `isBusy`, `error`). `TabsContext` owns the documents list, active tab, and recent files. `FileActionsContext` owns all async Tauri operations and dispatches to the other two contexts via their setters. Each context is a separate file with its own hook, keeping every file under ~150 lines and single-purpose.

**Tech Stack:** React 18, TypeScript, Tauri v2, `@tauri-apps/plugin-dialog`, `@tauri-apps/api/core`, Vite 6.

## Global Constraints

- All UI copy stays in **Portuguese (Brazilian)** — labels, errors, tooltips, dialogs.
- Only `.md` files are supported in v1; the Rust backend enforces this.
- No new runtime dependencies — remove `zustand`, do not add anything else.
- Keep `src/lib/fs.ts` as the single Tauri I/O layer; contexts call it, not Tauri directly.
- `src-tauri/` Rust code is **not touched** — this is a frontend-only refactor.
- Min window size 860×560; app language is pt-BR throughout.

---

## File Map

### Files to CREATE
| Path | Responsibility |
|---|---|
| `src/contexts/WorkspaceContext.tsx` | `view`, `isBusy`, `error` state + setters |
| `src/contexts/TabsContext.tsx` | `tabs[]`, `activeTabId`, `recentFiles` state + tab CRUD |
| `src/contexts/FileActionsContext.tsx` | Async Tauri ops: open, save, create, close, init |
| `src/contexts/index.ts` | Re-exports all 3 contexts + hooks for clean imports |

### Files to MODIFY
| Path | What changes |
|---|---|
| `src/app/App.tsx` | Wrap tree with 3 providers |
| `src/main.tsx` | No change needed |
| `src/components/layout/AppShell.tsx` | Replace `useDocumentStore` calls with context hooks |
| `src/components/layout/TitleBar.tsx` | Replace `useDocumentStore` with `useWorkspace`/`useFileActions` |
| `src/components/layout/FileTabs.tsx` | Replace `useDocumentStore` with `useTabs`/`useFileActions` |
| `src/components/layout/FileMenu.tsx` | Replace `useDocumentStore` with `useFileActions`/`useTabs` |
| `src/components/layout/WindowControls.tsx` | Replace `useDocumentStore` with `useFileActions` |
| `src/components/layout/StatusBar.tsx` | Replace `useDocumentStore` with `useTabs` |
| `src/components/home/Home.tsx` | No store usage — no change needed |
| `src/components/editor/Editor.lazy.tsx` | No change needed |
| `CLAUDE.md` | Full rewrite reflecting new architecture |

### Files to DELETE
| Path | Reason |
|---|---|
| `src/state/documentStore.ts` | Replaced entirely by the 3 context files |

---

## Task 1: Create WorkspaceContext

**Files:**
- Create: `src/contexts/WorkspaceContext.tsx`

**Interfaces:**
- Consumes: nothing (root-level context)
- Produces:
  - `WorkspaceView = "home" | "editor"`
  - `WorkspaceState = { view: WorkspaceView; isBusy: boolean; error: string | null }`
  - `WorkspaceSetters = { setView, setIsBusy, setError, clearError }`
  - `useWorkspace(): WorkspaceState & WorkspaceSetters`

- [ ] **Step 1: Create the file**

```tsx
// src/contexts/WorkspaceContext.tsx
import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

export type WorkspaceView = "home" | "editor";

type WorkspaceState = {
  view: WorkspaceView;
  isBusy: boolean;
  error: string | null;
};

type WorkspaceSetters = {
  setView: (view: WorkspaceView) => void;
  setIsBusy: (busy: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
};

type WorkspaceContextValue = WorkspaceState & WorkspaceSetters;

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<WorkspaceView>("home");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  return (
    <WorkspaceContext.Provider value={{ view, isBusy, error, setView, setIsBusy, setError, clearError }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return ctx;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -30
```

Expected: errors only about missing imports in other files (store still exists), not about this new file itself.

- [ ] **Step 3: Commit**

```bash
git add src/contexts/WorkspaceContext.tsx
git commit -m "feat: add WorkspaceContext for UI state (view, isBusy, error)"
```

---

## Task 2: Create TabsContext

**Files:**
- Create: `src/contexts/TabsContext.tsx`

**Interfaces:**
- Consumes: `WorkspaceContext` (calls `setView` when closing last tab)
- Produces:
  - `DocumentTab = { id, path, name, markdown, isDirty, lastSavedAt }`
  - `RecentFile = { path, name, openedAt }`
  - `TabsMeta = { id, path, name, isDirty }[]`
  - `useTabsContext(): { tabs, activeTabId, recentFiles, activeTab, tabsMeta, createTab, addTab, updateActiveMarkdown, switchTab, closeTabById, addRecentFile, setActiveTabId }`

- [ ] **Step 1: Create the file**

```tsx
// src/contexts/TabsContext.tsx
import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import { getFileName } from "../lib/fs";
import { useWorkspace } from "./WorkspaceContext";

export type DocumentTab = {
  id: string;
  path: string | null;
  name: string;
  markdown: string;
  isDirty: boolean;
  lastSavedAt: Date | null;
};

export type RecentFile = {
  path: string;
  name: string;
  openedAt: string;
};

export type TabsMeta = {
  id: string;
  path: string | null;
  name: string;
  isDirty: boolean;
};

type TabsContextValue = {
  tabs: DocumentTab[];
  activeTabId: string | null;
  recentFiles: RecentFile[];
  activeTab: DocumentTab | null;
  tabsMeta: TabsMeta[];
  createBlankTab: () => DocumentTab;
  addTab: (tab: DocumentTab) => void;
  updateActiveMarkdown: (markdown: string) => void;
  switchTab: (id: string) => void;
  closeTabById: (id: string) => void;
  addRecentFile: (path: string) => void;
  setActiveTabId: (id: string | null) => void;
  replaceTab: (updated: DocumentTab) => void;
};

const RECENT_FILES_KEY = "draftly:recent-files";
let nextTabId = 1;

function loadRecentFiles(): RecentFile[] {
  try {
    const raw = window.localStorage.getItem(RECENT_FILES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is RecentFile =>
          typeof item?.path === "string" &&
          typeof item?.name === "string" &&
          typeof item?.openedAt === "string",
      )
      .slice(0, 9);
  } catch {
    return [];
  }
}

function persistRecentFiles(files: RecentFile[]) {
  window.localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(files));
}

const TabsContext = createContext<TabsContextValue | null>(null);

export function TabsProvider({ children }: { children: ReactNode }) {
  const { setView } = useWorkspace();
  const [tabs, setTabs] = useState<DocumentTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>(loadRecentFiles);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0] ?? null;
  const tabsMeta: TabsMeta[] = tabs.map(({ id, path, name, isDirty }) => ({ id, path, name, isDirty }));

  const createBlankTab = (): DocumentTab => ({
    id: `tab-${nextTabId++}`,
    path: null,
    name: "Untitled.md",
    markdown: "",
    isDirty: false,
    lastSavedAt: null,
  });

  const addTab = (tab: DocumentTab) => {
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tab.id);
  };

  const updateActiveMarkdown = (markdown: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, markdown, isDirty: true } : t)),
    );
  };

  const switchTab = (id: string) => {
    if (tabs.some((t) => t.id === id)) {
      setActiveTabId(id);
      setView("editor");
    }
  };

  const closeTabById = (id: string) => {
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (next.length === 0) {
        setActiveTabId(null);
        setView("home");
      } else if (activeTabId === id) {
        const idx = prev.findIndex((t) => t.id === id);
        setActiveTabId(next[Math.max(0, idx - 1)].id);
      }
      return next;
    });
  };

  const addRecentFile = (path: string) => {
    setRecentFiles((prev) => {
      const next = [
        { path, name: getFileName(path), openedAt: new Date().toISOString() },
        ...prev.filter((f) => f.path !== path),
      ].slice(0, 9);
      persistRecentFiles(next);
      return next;
    });
  };

  const replaceTab = (updated: DocumentTab) => {
    setTabs((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setActiveTabId(updated.id);
  };

  return (
    <TabsContext.Provider
      value={{
        tabs,
        activeTabId,
        recentFiles,
        activeTab,
        tabsMeta,
        createBlankTab,
        addTab,
        updateActiveMarkdown,
        switchTab,
        closeTabById,
        addRecentFile,
        setActiveTabId,
        replaceTab,
      }}
    >
      {children}
    </TabsContext.Provider>
  );
}

export function useTabsContext(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("useTabsContext must be used inside TabsProvider");
  return ctx;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -30
```

Expected: no errors in the new file.

- [ ] **Step 3: Commit**

```bash
git add src/contexts/TabsContext.tsx
git commit -m "feat: add TabsContext for document tabs and recent files"
```

---

## Task 3: Create FileActionsContext

**Files:**
- Create: `src/contexts/FileActionsContext.tsx`

**Interfaces:**
- Consumes: `useWorkspace()`, `useTabsContext()`, `src/lib/fs.ts`
- Produces:
  - `useFileActions(): { initializeWorkspace, createDocument, openDocument, openDocumentFromPath, saveDocument, saveDocumentAs, closeDocument, canCloseApp }`

- [ ] **Step 1: Create the file**

```tsx
// src/contexts/FileActionsContext.tsx
import { confirm } from "@tauri-apps/plugin-dialog";
import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import {
  getInitialMarkdownFilePath,
  openMarkdownFile,
  pickMarkdownSavePath,
  readMarkdownFile,
  saveMarkdownFile,
  getFileName,
} from "../lib/fs";
import { useTabsContext } from "./TabsContext";
import type { DocumentTab } from "./TabsContext";
import { useWorkspace } from "./WorkspaceContext";

type FileActionsContextValue = {
  initializeWorkspace: () => Promise<void>;
  createDocument: () => void;
  openDocument: () => Promise<void>;
  openDocumentFromPath: (path: string) => Promise<void>;
  saveDocument: () => Promise<void>;
  saveDocumentAs: () => Promise<void>;
  closeDocument: (id: string) => Promise<boolean>;
  canCloseApp: () => Promise<boolean>;
};

async function confirmDiscardTabs(tabs: DocumentTab[]): Promise<boolean> {
  const dirty = tabs.filter((t) => t.isDirty);
  if (dirty.length === 0) return true;

  const message =
    dirty.length === 1
      ? `Descartar alterações não salvas em "${dirty[0].name}"?`
      : `Descartar alterações não salvas em ${dirty.length} arquivos?`;

  try {
    return await confirm(message, {
      title: "Descartar alterações?",
      kind: "warning",
      okLabel: "Descartar",
      cancelLabel: "Cancelar",
    });
  } catch {
    return window.confirm(message);
  }
}

const FileActionsContext = createContext<FileActionsContextValue | null>(null);

export function FileActionsProvider({ children }: { children: ReactNode }) {
  const { setView, setIsBusy, setError } = useWorkspace();
  const {
    tabs,
    activeTab,
    createBlankTab,
    addTab,
    addRecentFile,
    closeTabById,
    replaceTab,
  } = useTabsContext();

  const initializeWorkspace = async () => {
    setIsBusy(true);
    setError(null);
    try {
      const initialPath = await getInitialMarkdownFilePath();
      if (!initialPath) {
        setIsBusy(false);
        setView("home");
        return;
      }
      const file = await readMarkdownFile(initialPath);
      const tab = { ...createBlankTab(), path: file.path, name: file.name, markdown: file.content };
      addTab(tab);
      addRecentFile(file.path);
      setView("editor");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível abrir o arquivo inicial.");
      setView("home");
    } finally {
      setIsBusy(false);
    }
  };

  const createDocument = () => {
    const tab = createBlankTab();
    addTab(tab);
    setView("editor");
    setError(null);
  };

  const openDocument = async () => {
    setIsBusy(true);
    setError(null);
    try {
      const file = await openMarkdownFile();
      if (!file) return;

      const existing = tabs.find((t) => t.path === file.path);
      if (existing) {
        addRecentFile(file.path);
        setView("editor");
        return;
      }

      const tab = { ...createBlankTab(), path: file.path, name: file.name, markdown: file.content };
      addTab(tab);
      addRecentFile(file.path);
      setView("editor");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível abrir o arquivo.");
    } finally {
      setIsBusy(false);
    }
  };

  const openDocumentFromPath = async (path: string) => {
    setIsBusy(true);
    setError(null);
    try {
      const file = await readMarkdownFile(path);
      const existing = tabs.find((t) => t.path === file.path);
      if (existing) {
        addRecentFile(file.path);
        setView("editor");
        return;
      }
      const tab = { ...createBlankTab(), path: file.path, name: file.name, markdown: file.content };
      addTab(tab);
      addRecentFile(file.path);
      setView("editor");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível abrir o arquivo recente.");
    } finally {
      setIsBusy(false);
    }
  };

  const saveDocument = async () => {
    if (!activeTab) return;
    const targetPath = activeTab.path ?? (await pickMarkdownSavePath());
    if (!targetPath) return;

    setIsBusy(true);
    setError(null);
    try {
      await saveMarkdownFile(targetPath, activeTab.markdown);
      const saved: DocumentTab = {
        ...activeTab,
        path: targetPath,
        name: getFileName(targetPath),
        isDirty: false,
        lastSavedAt: new Date(),
      };
      replaceTab(saved);
      addRecentFile(targetPath);
      setView("editor");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o arquivo.");
    } finally {
      setIsBusy(false);
    }
  };

  const saveDocumentAs = async () => {
    if (!activeTab) return;
    const targetPath = await pickMarkdownSavePath(activeTab.path);
    if (!targetPath) return;

    setIsBusy(true);
    setError(null);
    try {
      await saveMarkdownFile(targetPath, activeTab.markdown);
      const saved: DocumentTab = {
        ...activeTab,
        path: targetPath,
        name: getFileName(targetPath),
        isDirty: false,
        lastSavedAt: new Date(),
      };
      replaceTab(saved);
      addRecentFile(targetPath);
      setView("editor");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o arquivo.");
    } finally {
      setIsBusy(false);
    }
  };

  const closeDocument = async (id: string): Promise<boolean> => {
    const tab = tabs.find((t) => t.id === id);
    if (!tab) return false;
    if (!(await confirmDiscardTabs([tab]))) return false;
    closeTabById(id);
    return true;
  };

  const canCloseApp = () => confirmDiscardTabs(tabs);

  return (
    <FileActionsContext.Provider
      value={{
        initializeWorkspace,
        createDocument,
        openDocument,
        openDocumentFromPath,
        saveDocument,
        saveDocumentAs,
        closeDocument,
        canCloseApp,
      }}
    >
      {children}
    </FileActionsContext.Provider>
  );
}

export function useFileActions(): FileActionsContextValue {
  const ctx = useContext(FileActionsContext);
  if (!ctx) throw new Error("useFileActions must be used inside FileActionsProvider");
  return ctx;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -40
```

Expected: no errors in the new file.

- [ ] **Step 3: Commit**

```bash
git add src/contexts/FileActionsContext.tsx
git commit -m "feat: add FileActionsContext for async Tauri file operations"
```

---

## Task 4: Create contexts/index.ts and wire providers into App

**Files:**
- Create: `src/contexts/index.ts`
- Modify: `src/app/App.tsx`

**Interfaces:**
- Consumes: all 3 providers + hooks from previous tasks
- Produces: `App` tree with providers; clean re-exports from `src/contexts`

- [ ] **Step 1: Create the barrel export**

```ts
// src/contexts/index.ts
export { WorkspaceProvider, useWorkspace } from "./WorkspaceContext";
export type { WorkspaceView } from "./WorkspaceContext";
export { TabsProvider, useTabsContext } from "./TabsContext";
export type { DocumentTab, RecentFile, TabsMeta } from "./TabsContext";
export { FileActionsProvider, useFileActions } from "./FileActionsContext";
```

- [ ] **Step 2: Update App.tsx to nest providers**

The order matters: `WorkspaceProvider` must wrap `TabsProvider` (which consumes it), which must wrap `FileActionsProvider` (which consumes both).

```tsx
// src/app/App.tsx
import { WorkspaceProvider } from "../contexts/WorkspaceContext";
import { TabsProvider } from "../contexts/TabsContext";
import { FileActionsProvider } from "../contexts/FileActionsContext";
import { AppShell } from "../components/layout/AppShell";

export function App() {
  return (
    <WorkspaceProvider>
      <TabsProvider>
        <FileActionsProvider>
          <AppShell />
        </FileActionsProvider>
      </TabsProvider>
    </WorkspaceProvider>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -30
```

Expected: no errors in the new/modified files. Errors may still exist in components that haven't been migrated yet.

- [ ] **Step 4: Commit**

```bash
git add src/contexts/index.ts src/app/App.tsx
git commit -m "feat: wire context providers into App tree"
```

---

## Task 5: Migrate AppShell.tsx

**Files:**
- Modify: `src/components/layout/AppShell.tsx`

**Interfaces:**
- Consumes: `useWorkspace`, `useTabsContext`, `useFileActions` from `src/contexts`

- [ ] **Step 1: Replace the file contents**

```tsx
// src/components/layout/AppShell.tsx
import { Suspense, useEffect, useRef } from "react";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import { useTabsContext } from "../../contexts/TabsContext";
import { useFileActions } from "../../contexts/FileActionsContext";
import { EditorLoading } from "../editor/EditorLoading";
import { MarkdownEditor, StatusBar } from "../editor/Editor.lazy";
import { Home } from "../home/Home";
import { TitleBar } from "./TitleBar";

export function AppShell() {
  const didInitialize = useRef(false);
  const { view, isBusy, error, clearError } = useWorkspace();
  const { activeTab, recentFiles } = useTabsContext();
  const { initializeWorkspace, createDocument, openDocument, openDocumentFromPath, saveDocument, updateActiveMarkdown } = useFileActions();

  // updateActiveMarkdown lives in TabsContext, not FileActionsContext — pull from there
  const { updateActiveMarkdown: updateMarkdown } = useTabsContext();

  useEffect(() => {
    if (didInitialize.current) return;
    didInitialize.current = true;
    void initializeWorkspace();
  }, [initializeWorkspace]);

  const showEditor = view === "editor" && activeTab != null;

  return (
    <div className="app-shell">
      <TitleBar />
      {error ? (
        <button className="error-banner" type="button" onClick={clearError}>
          {error}
        </button>
      ) : null}
      {showEditor ? (
        <Suspense fallback={<EditorLoading />}>
          <MarkdownEditor
            markdown={activeTab.markdown}
            onChange={updateMarkdown}
            onSave={() => void saveDocument()}
          />
          <StatusBar />
        </Suspense>
      ) : (
        <Home
          recentFiles={recentFiles}
          isBusy={isBusy}
          onCreate={createDocument}
          onOpen={() => void openDocument()}
          onOpenRecent={(path) => void openDocumentFromPath(path)}
        />
      )}
    </div>
  );
}
```

> Note: `updateActiveMarkdown` is on `useTabsContext`, not `useFileActions`. The `updateMarkdown` alias above resolves this clearly.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | grep -E "error TS|AppShell"
```

Expected: no errors for `AppShell.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/AppShell.tsx
git commit -m "refactor: migrate AppShell to use context hooks"
```

---

## Task 6: Migrate TitleBar, FileTabs, FileMenu, WindowControls, StatusBar

**Files:**
- Modify: `src/components/layout/TitleBar.tsx`
- Modify: `src/components/layout/FileTabs.tsx`
- Modify: `src/components/layout/FileMenu.tsx`
- Modify: `src/components/layout/WindowControls.tsx`
- Modify: `src/components/layout/StatusBar.tsx`

**Interfaces:**
- Consumes: `useWorkspace`, `useTabsContext`, `useFileActions`
- The store's `goHome` becomes `useWorkspace().setView("home")` called inline.
- The store's `selectActiveTab` becomes `useTabsContext().activeTab`.
- The store's `selectTabsMeta` becomes `useTabsContext().tabsMeta`.

- [ ] **Step 1: Update TitleBar.tsx**

```tsx
// src/components/layout/TitleBar.tsx
import { Plus } from "lucide-react";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import { useFileActions } from "../../contexts/FileActionsContext";
import { FileMenu } from "./FileMenu";
import { FileTabs } from "./FileTabs";
import { WindowControls } from "./WindowControls";

export function TitleBar() {
  const { setView } = useWorkspace();
  const { createDocument } = useFileActions();

  return (
    <header className="title-bar" data-tauri-drag-region>
      <div className="window-brand">
        <button
          className="app-home-button"
          type="button"
          aria-label="Home"
          title="Home"
          onClick={() => setView("home")}
        >
          <img className="app-mark" src="/src/assets/icon.svg" alt="" aria-hidden="true" />
        </button>
      </div>

      <div className="tab-strip" data-tauri-drag-region>
        <FileTabs />
        <button
          className="new-tab-button"
          type="button"
          aria-label="Novo arquivo"
          title="Novo arquivo"
          onClick={createDocument}
        >
          <span className="new-tab-button-icon">
            <Plus size={14} />
          </span>
        </button>
      </div>

      <div className="title-actions">
        <FileMenu />
        <WindowControls />
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Update FileTabs.tsx**

```tsx
// src/components/layout/FileTabs.tsx
import { X } from "lucide-react";
import { useTabsContext } from "../../contexts/TabsContext";
import { useFileActions } from "../../contexts/FileActionsContext";

export function FileTabs() {
  const { tabsMeta, activeTabId, switchTab } = useTabsContext();
  const { closeDocument } = useFileActions();

  if (tabsMeta.length === 0) return null;

  const activeTabIndex = tabsMeta.findIndex((t) => t.id === activeTabId);

  return (
    <div className="tabs-list" role="tablist" aria-label="Arquivos abertos">
      {tabsMeta.map((tab, index) => {
        const isActive = tab.id === activeTabId;
        const shouldShowDivider =
          !isActive &&
          activeTabIndex >= 0 &&
          index > activeTabIndex &&
          index < tabsMeta.length - 1;

        return (
          <div
            aria-selected={isActive}
            className={`file-tab ${isActive ? "is-active" : ""} ${
              shouldShowDivider ? "has-divider" : ""
            }`}
            key={tab.id}
            role="tab"
            tabIndex={0}
            title={tab.name}
            onClick={() => switchTab(tab.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                switchTab(tab.id);
              }
            }}
          >
            <span className="file-tab-name">{tab.name}</span>
            {tab.isDirty ? <span className="dirty-dot" aria-label="Não salvo" /> : null}
            {isActive ? (
              <button
                className="file-tab-close"
                type="button"
                aria-label={`Fechar ${tab.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  void closeDocument(tab.id);
                }}
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Update FileMenu.tsx**

```tsx
// src/components/layout/FileMenu.tsx
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { FilePlus, FileText, FolderOpen, MoreVertical, Save, SaveAll } from "lucide-react";
import { useTabsContext } from "../../contexts/TabsContext";
import { useFileActions } from "../../contexts/FileActionsContext";
import { exportMarkdownToPdf } from "../../lib/fs";

export function FileMenu() {
  const { activeTab } = useTabsContext();
  const { createDocument, openDocument, saveDocument, saveDocumentAs } = useFileActions();

  const handleExportPdf = () => {
    if (activeTab) exportMarkdownToPdf(activeTab.name, activeTab.markdown);
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="titlebar-button" type="button" aria-label="Menu" title="Menu">
          <MoreVertical size={16} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="title-menu-content" align="end" sideOffset={8}>
          <DropdownMenu.Item className="title-menu-item" onSelect={createDocument}>
            <span className="title-menu-label">
              <FilePlus size={15} />
              Novo arquivo
            </span>
            <span className="title-menu-shortcut">Ctrl+N</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item className="title-menu-item" onSelect={() => void openDocument()}>
            <span className="title-menu-label">
              <FolderOpen size={15} />
              Abrir
            </span>
            <span className="title-menu-shortcut">Ctrl+O</span>
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="title-menu-separator" />

          <DropdownMenu.Item className="title-menu-item" onSelect={() => void saveDocument()}>
            <span className="title-menu-label">
              <Save size={15} />
              Salvar
            </span>
            <span className="title-menu-shortcut">Ctrl+S</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item className="title-menu-item" onSelect={() => void saveDocumentAs()}>
            <span className="title-menu-label">
              <SaveAll size={15} />
              Salvar como
            </span>
            <span className="title-menu-shortcut">Ctrl+Shift+S</span>
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="title-menu-separator" />

          <DropdownMenu.Item
            className="title-menu-item"
            onSelect={handleExportPdf}
            disabled={!activeTab}
          >
            <span className="title-menu-label">
              <FileText size={15} />
              Exportar PDF
            </span>
            <span className="title-menu-shortcut">Ctrl+P</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
```

- [ ] **Step 4: Update WindowControls.tsx**

```tsx
// src/components/layout/WindowControls.tsx
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useFileActions } from "../../contexts/FileActionsContext";

const appWindow = getCurrentWindow();

export function WindowControls() {
  const { canCloseApp } = useFileActions();
  const canCloseAppRef = useRef(canCloseApp);
  canCloseAppRef.current = canCloseApp;

  const isClosing = useRef(false);

  useEffect(() => {
    const unlistenPromise = appWindow.onCloseRequested(async (event) => {
      if (isClosing.current) return;
      event.preventDefault();
      if (await canCloseAppRef.current()) {
        isClosing.current = true;
        void appWindow.close();
      }
    });

    return () => {
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  const closeWindow = async () => {
    if (await canCloseAppRef.current()) {
      isClosing.current = true;
      void appWindow.close();
    }
  };

  return (
    <div className="window-controls" role="group" aria-label="Controles da janela">
      <button
        className="window-control"
        type="button"
        aria-label="Minimizar"
        title="Minimizar"
        onClick={() => void appWindow.minimize()}
      >
        <Minus size={13} />
      </button>
      <button
        className="window-control"
        type="button"
        aria-label="Maximizar"
        title="Maximizar"
        onClick={() => void appWindow.toggleMaximize()}
      >
        <Square size={11} />
      </button>
      <button
        className="window-control is-close"
        type="button"
        aria-label="Fechar"
        title="Fechar"
        onClick={() => void closeWindow()}
      >
        <X size={13} />
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Update StatusBar.tsx**

```tsx
// src/components/layout/StatusBar.tsx
import { useTabsContext } from "../../contexts/TabsContext";

export function StatusBar() {
  const { activeTab } = useTabsContext();
  if (!activeTab) return null;

  const status = activeTab.isDirty
    ? "Alterações não salvas"
    : activeTab.lastSavedAt
      ? `Salvo ${activeTab.lastSavedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
      : "Pronto";

  return (
    <footer className="status-bar">
      <span>{status}</span>
      <span>Markdown</span>
      <span>UTF-8</span>
      <span className="status-path">{activeTab.path || "Arquivo novo"}</span>
    </footer>
  );
}
```

- [ ] **Step 6: Verify TypeScript compiles cleanly**

```bash
npm run build 2>&1 | grep "error TS"
```

Expected: no `error TS` lines.

- [ ] **Step 7: Commit**

```bash
git add src/components/layout/TitleBar.tsx \
        src/components/layout/FileTabs.tsx \
        src/components/layout/FileMenu.tsx \
        src/components/layout/WindowControls.tsx \
        src/components/layout/StatusBar.tsx
git commit -m "refactor: migrate all layout components to context hooks"
```

---

## Task 7: Delete documentStore.ts and remove zustand

**Files:**
- Delete: `src/state/documentStore.ts`
- Modify: `package.json` (remove `zustand` dependency)

- [ ] **Step 1: Verify nothing imports documentStore**

```bash
grep -r "documentStore" src/ --include="*.ts" --include="*.tsx"
```

Expected: no output (zero matches).

- [ ] **Step 2: Delete the file**

```bash
rm src/state/documentStore.ts
```

- [ ] **Step 3: Remove zustand from package.json**

```bash
npm uninstall zustand
```

- [ ] **Step 4: Verify build still passes**

```bash
npm run build 2>&1 | grep "error TS"
```

Expected: no `error TS` lines.

- [ ] **Step 5: Remove empty state directory if unused**

```bash
ls src/state/ 2>/dev/null && rmdir src/state/ 2>/dev/null || true
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: remove documentStore.ts and zustand dependency"
```

---

## Task 8: Fix AppShell.tsx — remove duplicate updateMarkdown

In Task 5, `AppShell.tsx` has a redundant double-destructure pattern. Clean it up now that all other components are migrated and we can verify the pattern is clear.

**Files:**
- Modify: `src/components/layout/AppShell.tsx`

- [ ] **Step 1: Remove the redundant alias line**

The file currently has:
```tsx
const { updateActiveMarkdown, saveDocument, ... } = useFileActions();
const { updateActiveMarkdown: updateMarkdown } = useTabsContext();
```

Replace both import blocks with the clean version:

```tsx
// src/components/layout/AppShell.tsx
import { Suspense, useEffect, useRef } from "react";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import { useTabsContext } from "../../contexts/TabsContext";
import { useFileActions } from "../../contexts/FileActionsContext";
import { EditorLoading } from "../editor/EditorLoading";
import { MarkdownEditor, StatusBar } from "../editor/Editor.lazy";
import { Home } from "../home/Home";
import { TitleBar } from "./TitleBar";

export function AppShell() {
  const didInitialize = useRef(false);
  const { view, isBusy, error, clearError } = useWorkspace();
  const { activeTab, recentFiles, updateActiveMarkdown } = useTabsContext();
  const { initializeWorkspace, createDocument, openDocument, openDocumentFromPath, saveDocument } = useFileActions();

  useEffect(() => {
    if (didInitialize.current) return;
    didInitialize.current = true;
    void initializeWorkspace();
  }, [initializeWorkspace]);

  const showEditor = view === "editor" && activeTab != null;

  return (
    <div className="app-shell">
      <TitleBar />
      {error ? (
        <button className="error-banner" type="button" onClick={clearError}>
          {error}
        </button>
      ) : null}
      {showEditor ? (
        <Suspense fallback={<EditorLoading />}>
          <MarkdownEditor
            markdown={activeTab.markdown}
            onChange={updateActiveMarkdown}
            onSave={() => void saveDocument()}
          />
          <StatusBar />
        </Suspense>
      ) : (
        <Home
          recentFiles={recentFiles}
          isBusy={isBusy}
          onCreate={createDocument}
          onOpen={() => void openDocument()}
          onOpenRecent={(path) => void openDocumentFromPath(path)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Final build check**

```bash
npm run build 2>&1 | grep "error TS"
```

Expected: no output.

- [ ] **Step 3: Run dev server and smoke-test the app**

```bash
npm run tauri:dev
```

Verify manually:
- Home screen loads
- "Novo arquivo" opens editor
- "Abrir" opens file picker
- Typing marks tab as dirty (dot appears)
- Ctrl+S saves
- Tab close with unsaved changes shows dialog
- Recent files list on home screen
- Window X button shows discard dialog if dirty

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/AppShell.tsx
git commit -m "refactor: clean up AppShell after context migration"
```

---

## Task 9: Rewrite CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Replace CLAUDE.md with the new version**

```markdown
# CLAUDE.md

This file provides guidance to Claude Code and AI agents when working with this repository.

## Project Overview

Draftly is a Tauri v2 desktop Markdown editor — minimalist, local-first, dark-themed. v1 MVP handles only `.md` files. Uses a visual (WYSIWYG) editing approach via BlockNote with a custom titlebar, tab management, and a home screen with recent files.

## Commands

\`\`\`bash
npm run dev          # Vite dev server on port 1420 (HMR on 1421)
npm run build        # TypeScript check + Vite production build
npm run tauri:dev    # Tauri dev (opens desktop window, runs Vite in background)
npm run tauri:build  # Tauri production desktop build
\`\`\`

There are no tests yet.

## Architecture

### Tech Stack

- **Frontend**: React 18, TypeScript, Vite 6
- **Desktop shell**: Tauri v2 (Rust)
- **State management**: React Context API (3 domain contexts — see below)
- **Editor**: BlockNote (`@blocknote/react` + `@blocknote/mantine`) — block-based rich text editing, converts to/from Markdown
- **UI primitives**: Radix UI (dropdown-menu, tooltip), Lucide React icons
- **Styling**: Custom CSS per component group (`globals.css`, `shell.css`, `titlebar.css`, `home.css`, `editor.css`)

### File Structure

\`\`\`
src/
  main.tsx                  # Entry point, mounts <App />
  app/App.tsx               # Root component — nests 3 context providers, renders <AppShell />
  contexts/
    WorkspaceContext.tsx     # UI state: view ("home"|"editor"), isBusy, error
    TabsContext.tsx          # Document state: tabs[], activeTabId, recentFiles + tab CRUD
    FileActionsContext.tsx   # Async operations: open, save, create, close (calls lib/fs.ts + Tauri)
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
    editor/EditorToolbar.tsx  # Formatting toolbar: bold, italic, headings, links, code, etc.
    editor/Editor.lazy.tsx   # React.lazy() wrappers for MarkdownEditor and StatusBar
    editor/EditorLoading.tsx  # Suspense fallback while editor loads
    ui/IconButton.tsx        # Icon button with Radix tooltip
  lib/fs.ts                  # File I/O layer — wraps Tauri invoke() calls (only file that touches Tauri)
  styles/                    # CSS files
\`\`\`

### Context Architecture

There are exactly 3 contexts. Use the right one for each job:

| Context | Hook | Owns |
|---|---|---|
| `WorkspaceContext` | `useWorkspace()` | `view`, `isBusy`, `error`, `clearError`, `setView` |
| `TabsContext` | `useTabsContext()` | `tabs[]`, `activeTab`, `tabsMeta`, `activeTabId`, `recentFiles`, `updateActiveMarkdown`, `switchTab`, `replaceTab` |
| `FileActionsContext` | `useFileActions()` | `initializeWorkspace`, `createDocument`, `openDocument`, `openDocumentFromPath`, `saveDocument`, `saveDocumentAs`, `closeDocument`, `canCloseApp` |

Provider nesting order in `App.tsx` (outermost first):
1. `WorkspaceProvider`
2. `TabsProvider` (consumes WorkspaceContext)
3. `FileActionsProvider` (consumes WorkspaceContext + TabsContext)

**Rule:** Components never import from `src/state/`. All state comes from `src/contexts/`.

### Rust Backend (`src-tauri/src/lib.rs`)

Three Tauri commands:
- `read_markdown_file(path)` — reads a `.md` file, validates `.md` extension
- `write_markdown_file(path, content)` — writes content, validates `.md` extension
- `get_initial_markdown_file_path()` — scans CLI args for a `.md` path (for "Open with" OS integration)

The `.md` extension check is enforced server-side in Rust. Non-md files are rejected with a Portuguese error message.

**Rule:** Only `src/lib/fs.ts` calls `invoke()`. Context files import from `lib/fs.ts`, not from `@tauri-apps/api/core` directly.

### File I/O Layer (`src/lib/fs.ts`)

All Tauri IPC calls are isolated here. Public API:
- `readMarkdownFile(path)` → `Promise<MarkdownFile>`
- `openMarkdownFile()` → `Promise<MarkdownFile | null>` (opens native file picker)
- `pickMarkdownSavePath(defaultPath?)` → `Promise<string | null>` (opens native save dialog)
- `saveMarkdownFile(path, content)` → `Promise<void>`
- `getInitialMarkdownFilePath()` → `Promise<string | null>`
- `getFileName(path)` → `string`
- `exportMarkdownToPdf(name, markdown)` → opens print window

### Editor Details

The `MarkdownEditor` component wraps BlockNote:
- Uses `tryParseMarkdownToBlocks()` to convert markdown string → BlockNote blocks
- Uses `blocksToMarkdownLossy()` to convert blocks → markdown string
- Tracks `externalMarkdown` ref to avoid re-parsing content that originated from the editor itself
- Ctrl+S / Cmd+S keyboard shortcut for save (registered in `MarkdownEditor`, calls `onSave` prop)
- Custom scrollbar: a draggable thumb that auto-hides after 900ms of inactivity
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

## Design Reference

`screens-ui/DESIGN.md` contains the full product design spec — design tokens (colors, typography, spacing), component specifications, screen layouts, and the long-term vision (JSON editor, code editor, command palette, settings modal, multi-file-type support). The v1 MVP implements the Markdown Visual Editor and Home screen only.

## Where to Make Changes

| I want to... | Touch this file |
|---|---|
| Change view routing logic | `WorkspaceContext.tsx` |
| Add a new tab action (e.g., rename, duplicate) | `TabsContext.tsx` |
| Add a new file operation (e.g., export) | `FileActionsContext.tsx` + `lib/fs.ts` |
| Change the toolbar layout | `EditorToolbar.tsx` |
| Change the home screen layout | `Home.tsx` |
| Change tab appearance | `FileTabs.tsx` + `titlebar.css` |
| Change status bar info | `StatusBar.tsx` |
| Change the Tauri backend commands | `src-tauri/src/lib.rs` |
| Change the file picker behavior | `lib/fs.ts` |
| Add a new Rust command | `src-tauri/src/lib.rs` + `lib/fs.ts` (wrapper) + relevant context |
```

- [ ] **Step 2: Verify the build still passes**

```bash
npm run build 2>&1 | grep "error TS"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: rewrite CLAUDE.md to reflect context architecture"
```

---

## Self-Review Checklist

- [x] **Spec coverage**: WorkspaceContext, TabsContext, FileActionsContext all created. All components migrated. `documentStore.ts` deleted. `zustand` removed. CLAUDE.md rewritten.
- [x] **Placeholder scan**: No TBDs. All code blocks are complete.
- [x] **Type consistency**: `DocumentTab` defined in `TabsContext.tsx` and imported by `FileActionsContext.tsx`. `replaceTab(updated: DocumentTab)` defined in Task 2 and used in Task 3. `createBlankTab()` returns `DocumentTab` spread-extended in Task 3. `tabsMeta` defined as `TabsMeta[]` in Task 2 and consumed in Task 6 (`FileTabs`). All names consistent.
- [x] **AppShell double-import bug**: Flagged in Task 5 note and fixed cleanly in Task 8 — the clean version is the canonical one. Task 5 intentionally writes the slightly verbose version so the migration is incremental; Task 8 cleans it up.
