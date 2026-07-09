# Contexts Hooks Extraction + Session Persistence — Design

> **Date:** 2026-07-08
> **Status:** Validated (brainstorming session)
> **Scope:** Frontend-only refactor — no new dependencies, no Rust changes, no component API changes.

## Goal

Refactor the 3 React Context providers to extract business logic into dedicated hooks, add session persistence via `localStorage`, stabilize re-renders with `useMemo`/`useCallback`, and eliminate code duplication in `FileActionsContext`. Zero changes to component APIs or `lib/fs.ts`.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| State management | Keep React Context API | No new dependencies; team already knows the pattern |
| Logic organization | Hooks extracted to `contexts/hooks/` | Providers become thin shells; hooks testable in isolation |
| Session persistence | `localStorage` | Already used for `recentFiles`; no new deps; sufficient for Markdown |
| Duplication fix | Shared `openFile`/`saveFile` internals + `withBusy` helper | ~160 lines → ~80 lines in FileActions |
| Re-render stability | `useMemo` on context values | Prevents cascading re-renders when state slices update |

## File Structure (target)

```
src/contexts/
  hooks/
    useWorkspaceState.ts        # view, isBusy, error state + setters
    useTabManager.ts            # tabs CRUD, activeTabId, switch, close, replace
    useRecentFiles.ts           # localStorage read/write for recent files
    useSessionPersistence.ts    # save/restore tabs + view from localStorage
    useFileOperations.ts        # open, save, create, close — withBusy + shared internals
  WorkspaceContext.tsx           # Thin provider (~15 lines)
  TabsContext.tsx                # Thin provider (~30 lines)
  FileActionsContext.tsx         # Thin provider (~25 lines)
  index.ts                       # Re-exports (unchanged API)
```

## Hook Details

### `useWorkspaceState`

Extracts the 3 `useState` calls + `clearError` from the current provider. No dependencies on other contexts.

```ts
function useWorkspaceState() {
  const [view, setView] = useState<WorkspaceView>("home");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clearError = useCallback(() => setError(null), []);
  return { view, isBusy, error, setView, setIsBusy, setError, clearError };
}
```

### `useTabManager`

Receives `setView` (from WorkspaceContext) as a parameter. Owns `tabs[]`, `activeTabId`, and all tab mutation functions. Derives `activeTab` and `tabsMeta` via computed values (not separate state).

**Key detail:** `closeTabById` calls `setView("home")` when the last tab closes — this is the only place TabsContext reaches into WorkspaceContext.

### `useRecentFiles`

Extracts the `localStorage` read/write logic currently inline in `TabsProvider`. Same `draftly:recent-files` key, same 9-item cap, same defensive JSON parsing.

```ts
function useRecentFiles() {
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>(loadRecentFiles);
  const addRecentFile = useCallback((path: string) => { /* ... */ }, []);
  return { recentFiles, addRecentFile };
}
```

### `useSessionPersistence`

**Restore (on mount):**
1. Read `draftly:session` from `localStorage`
2. If absent, start fresh (view="home", no tabs)
3. Validate JSON shape defensively (same pattern as `loadRecentFiles`)
4. Restore `tabsMeta[]` (id, path, name, isDirty), `activeTabId`, `view`
5. For tabs with `path`: re-read content from disk via `readMarkdownFile(path)`
6. For untitled tabs (no path): read content from `draftly:session:untitled-{id}`
7. If a file no longer exists on disk, drop that tab from the session

**Persist (on change):**
- `useEffect` watching `[tabsMeta, activeTabId, view]`
- Saves metadata to `draftly:session`
- Saves untitled tab content to `draftly:session:untitled-{id}`

**Cleanup:**
- Closing an untitled tab removes its `draftly:session:untitled-{id}` key
- Saving an untitled tab (Save As) migrates content from `localStorage` to disk, then removes the untitled key

**localStorage keys:**

| Key | Content |
|---|---|
| `draftly:recent-files` | `RecentFile[]` (existing, unchanged) |
| `draftly:session` | `{ tabsMeta[], activeTabId, view }` |
| `draftly:session:untitled-{id}` | `string` — markdown content |

### `useFileOperations`

Receives all dependencies as a params object (setters from Workspace, tab CRUD from Tabs). Extracts the current inline logic into:

**Internal helpers:**
- `withBusy(fn)` — wraps `setIsBusy(true)` → `try/catch` → `setError` → `finally setIsBusy(false)`
- `openFile(file: MarkdownFile)` — dedup check, tab creation, recentFiles update
- `saveFile(targetPath: string)` — write to disk, replace tab, recentFiles update

**Public API (unchanged signatures):**
- `initializeWorkspace()` — CLI arg scan on startup
- `createDocument()` — blank tab, no async
- `openDocument()` — native picker → `openFile`
- `openDocumentFromPath(path)` — direct read → `openFile`
- `saveDocument()` — uses `activeTab.path` or picker → `saveFile`
- `saveDocumentAs()` — picker → `saveFile`
- `closeDocument(id)` — confirm discard → close tab
- `canCloseApp()` — confirm discard for all dirty tabs

The 4 I/O functions (`openDocument`, `openDocumentFromPath`, `saveDocument`, `saveDocumentAs`) become ~5 lines each, delegating to `openFile`/`saveFile` + `withBusy`.

## Provider Composition

Each provider becomes a thin shell:

```tsx
// WorkspaceProvider (~15 lines)
export function WorkspaceProvider({ children }) {
  const state = useWorkspaceState();
  const value = useMemo(() => state, [state.view, state.isBusy, state.error]);
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

// TabsProvider (~30 lines)
export function TabsProvider({ children }) {
  const { setView } = useWorkspace();
  const tabManager = useTabManager(setView);
  const { recentFiles, addRecentFile } = useRecentFiles();
  useSessionPersistence(tabManager.tabsMeta, tabManager.activeTabId, /* ... */);

  const value = useMemo(() => ({
    ...tabManager, recentFiles, addRecentFile
  }), [tabManager.tabs, tabManager.activeTabId, recentFiles]);

  return <TabsContext.Provider value={value}>{children}</TabsContext.Provider>;
}

// FileActionsProvider (~25 lines)
export function FileActionsProvider({ children }) {
  const { setView, setIsBusy, setError } = useWorkspace();
  const { tabs, activeTab, createBlankTab, addTab, addRecentFile, closeTabById, replaceTab } = useTabsContext();
  const operations = useFileOperations({ setView, setIsBusy, setError, tabs, activeTab, createBlankTab, addTab, addRecentFile, closeTabById, replaceTab });
  const value = useMemo(() => operations, [/* stable deps */]);
  return <FileActionsContext.Provider value={value}>{children}</FileActionsContext.Provider>;
}
```

Nesting order in `App.tsx` stays identical:
1. `WorkspaceProvider`
2. `TabsProvider`
3. `FileActionsProvider`

## What Does NOT Change

- Component APIs — `useWorkspace()`, `useTabsContext()`, `useFileActions()` have identical return types
- `lib/fs.ts` — no changes
- `src-tauri/` — no Rust changes
- `App.tsx` — same nesting order
- All UI copy stays in Portuguese (Brazilian)
- No new runtime dependencies

## Migration Strategy (5 Commits)

| Step | What | Risk |
|---|---|---|
| 1 | Create `useWorkspaceState.ts`, refactor `WorkspaceProvider` | Minimal — simplest provider |
| 2 | Create `useTabManager.ts` + `useRecentFiles.ts`, refactor `TabsProvider` | Medium — most logic lives here |
| 3 | Create `useSessionPersistence.ts`, integrate into `TabsProvider` | Medium — new behavior (session restore) |
| 4 | Create `useFileOperations.ts` with `withBusy`/`openFile`/`saveFile`, refactor `FileActionsProvider` | Low — same external API |
| 5 | Add `useMemo` to all 3 provider values | Low — performance optimization |

Each step is independently buildable (`npm run build`) and testable (`npm run tauri:dev`).

## Edge Cases

- **Corrupted `localStorage`:** Defensive JSON parsing in all load functions — returns safe defaults on failure
- **File deleted from disk between sessions:** `useSessionPersistence` catches read errors and drops the tab
- **Multiple untitled tabs:** Each gets its own `draftly:session:untitled-{id}` key, no collision
- **Empty session:** First launch or after clearing localStorage — starts at home screen, no tabs
- **Tab switch during save:** `saveFile` uses `activeTab` from closure — if tab changes mid-save, the correct tab is still saved (uses the tab reference captured when save was initiated)
