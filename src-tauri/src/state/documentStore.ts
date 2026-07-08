import { confirm } from "@tauri-apps/plugin-dialog";
import { create } from "zustand";
import {
  getInitialMarkdownFilePath,
  getFileName,
  openMarkdownFile,
  pickMarkdownSavePath,
  readMarkdownFile,
  saveMarkdownFile,
} from "../lib/fs";

export type WorkspaceView = "home" | "editor";

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

type DocumentState = {
  tabs: DocumentTab[];
  activeTabId: string | null;
  view: WorkspaceView;
  recentFiles: RecentFile[];
  isBusy: boolean;
  error: string | null;
  initializeWorkspace: () => Promise<void>;
  goHome: () => void;
  createDocument: () => void;
  updateMarkdown: (markdown: string) => void;
  openDocument: () => Promise<void>;
  openDocumentFromPath: (path: string) => Promise<void>;
  saveDocument: () => Promise<void>;
  saveDocumentAs: () => Promise<void>;
  switchDocument: (id: string) => void;
  closeDocument: (id: string) => Promise<boolean>;
  canCloseApp: () => Promise<boolean>;
  clearError: () => void;
};

let nextTabId = 1;
const recentFilesStorageKey = "draftly:recent-files";

function createTab(overrides: Partial<DocumentTab> = {}): DocumentTab {
  return {
    id: `tab-${nextTabId++}`,
    path: null,
    name: "Untitled.md",
    markdown: "",
    isDirty: false,
    lastSavedAt: null,
    ...overrides,
  };
}

function findActiveTab(state: Pick<DocumentState, "tabs" | "activeTabId">) {
  return state.tabs.find((tab) => tab.id === state.activeTabId) || state.tabs[0] || null;
}

async function confirmDiscardTabs(tabs: DocumentTab[]) {
  const dirtyTabs = tabs.filter((tab) => tab.isDirty);

  if (dirtyTabs.length === 0) {
    return true;
  }

  const message =
    dirtyTabs.length === 1
      ? `Descartar alteracoes nao salvas em "${dirtyTabs[0].name}"?`
      : `Descartar alteracoes nao salvas em ${dirtyTabs.length} arquivos?`;

  try {
    return await confirm(message, {
      title: "Descartar alteracoes?",
      kind: "warning",
      okLabel: "Descartar",
      cancelLabel: "Cancelar",
    });
  } catch {
    return window.confirm(message);
  }
}

function loadRecentFiles() {
  try {
    const value = window.localStorage.getItem(recentFilesStorageKey);
    if (!value) return [];

    const parsed = JSON.parse(value);
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

function persistRecentFiles(recentFiles: RecentFile[]) {
  window.localStorage.setItem(recentFilesStorageKey, JSON.stringify(recentFiles));
}

function addRecentFile(recentFiles: RecentFile[], path: string): RecentFile[] {
  const nextRecentFiles = [
    { path, name: getFileName(path), openedAt: new Date().toISOString() },
    ...recentFiles.filter((file) => file.path !== path),
  ].slice(0, 9);

  persistRecentFiles(nextRecentFiles);
  return nextRecentFiles;
}

export const selectActiveTab = (state: DocumentState) => findActiveTab(state);
export const selectWorkspaceView = (state: DocumentState): WorkspaceView =>
  state.view === "editor" && state.tabs.length > 0 ? "editor" : "home";

export const useDocumentStore = create<DocumentState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  view: "home",
  recentFiles: loadRecentFiles(),
  isBusy: false,
  error: null,

  initializeWorkspace: async () => {
    set({ isBusy: true, error: null });

    try {
      const initialPath = await getInitialMarkdownFilePath();

      if (!initialPath) {
        set({ isBusy: false, view: "home", activeTabId: null });
        return;
      }

      const file = await readMarkdownFile(initialPath);
      const tab = createTab({
        path: file.path,
        name: file.name,
        markdown: file.content,
      });

      set({
        tabs: [tab],
        activeTabId: tab.id,
        view: "editor",
        recentFiles: addRecentFile(get().recentFiles, file.path),
        isBusy: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Nao foi possivel abrir o arquivo inicial.",
        isBusy: false,
        view: "home",
      });
    }
  },

  goHome: () => set({ view: "home" }),

  createDocument: () => {
    const tab = createTab();

    set({
      tabs: [...get().tabs, tab],
      activeTabId: tab.id,
      view: "editor",
      error: null,
    });
  },

  updateMarkdown: (markdown) => {
    const { activeTabId, tabs } = get();
    if (!activeTabId) return;

    set({
      tabs: tabs.map((tab) =>
        tab.id === activeTabId ? { ...tab, markdown, isDirty: true } : tab,
      ),
    });
  },

  openDocument: async () => {
    set({ isBusy: true, error: null });

    try {
      const file = await openMarkdownFile();

      if (!file) {
        set({ isBusy: false });
        return;
      }

      const existingTab = get().tabs.find((tab) => tab.path === file.path);

      if (existingTab) {
        set({
          activeTabId: existingTab.id,
          view: "editor",
          recentFiles: addRecentFile(get().recentFiles, file.path),
          isBusy: false,
        });
        return;
      }

      const tab = createTab({
        path: file.path,
        name: file.name,
        markdown: file.content,
      });

      set({
        tabs: [...get().tabs, tab],
        activeTabId: tab.id,
        view: "editor",
        recentFiles: addRecentFile(get().recentFiles, file.path),
        isBusy: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Nao foi possivel abrir o arquivo.",
        isBusy: false,
      });
    }
  },

  openDocumentFromPath: async (path) => {
    set({ isBusy: true, error: null });

    try {
      const file = await readMarkdownFile(path);
      const existingTab = get().tabs.find((tab) => tab.path === file.path);

      if (existingTab) {
        set({
          activeTabId: existingTab.id,
          view: "editor",
          recentFiles: addRecentFile(get().recentFiles, file.path),
          isBusy: false,
        });
        return;
      }

      const tab = createTab({
        path: file.path,
        name: file.name,
        markdown: file.content,
      });

      set({
        tabs: [...get().tabs, tab],
        activeTabId: tab.id,
        view: "editor",
        recentFiles: addRecentFile(get().recentFiles, file.path),
        isBusy: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Nao foi possivel abrir o arquivo recente.",
        isBusy: false,
      });
    }
  },

  saveDocument: async () => {
    const activeTab = findActiveTab(get());
    if (!activeTab) return;

    const targetPath = activeTab.path || (await pickMarkdownSavePath());

    if (!targetPath) {
      return;
    }

    set({ isBusy: true, error: null });

    try {
      await saveMarkdownFile(targetPath, activeTab.markdown);

      const savedTab: DocumentTab = {
        ...activeTab,
        path: targetPath,
        name: getFileName(targetPath),
        isDirty: false,
        lastSavedAt: new Date(),
      };

      set({
        tabs: get().tabs.map((tab) => (tab.id === activeTab.id ? savedTab : tab)),
        activeTabId: savedTab.id,
        view: "editor",
        recentFiles: addRecentFile(get().recentFiles, targetPath),
        isBusy: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Nao foi possivel salvar o arquivo.",
        isBusy: false,
      });
    }
  },

  saveDocumentAs: async () => {
    const activeTab = findActiveTab(get());
    if (!activeTab) return;

    const targetPath = await pickMarkdownSavePath(activeTab.path);

    if (!targetPath) {
      return;
    }

    set({ isBusy: true, error: null });

    try {
      await saveMarkdownFile(targetPath, activeTab.markdown);

      const savedTab: DocumentTab = {
        ...activeTab,
        path: targetPath,
        name: getFileName(targetPath),
        isDirty: false,
        lastSavedAt: new Date(),
      };

      set({
        tabs: get().tabs.map((tab) => (tab.id === activeTab.id ? savedTab : tab)),
        activeTabId: savedTab.id,
        view: "editor",
        recentFiles: addRecentFile(get().recentFiles, targetPath),
        isBusy: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Nao foi possivel salvar o arquivo.",
        isBusy: false,
      });
    }
  },

  switchDocument: (id) => {
    if (get().tabs.some((tab) => tab.id === id)) {
      set({ activeTabId: id, view: "editor" });
    }
  },

  closeDocument: async (id) => {
    const { activeTabId, tabs } = get();
    const tabToClose = tabs.find((tab) => tab.id === id);

    if (!tabToClose || !(await confirmDiscardTabs([tabToClose]))) {
      return false;
    }

    if (tabs.length === 1) {
      set({
        tabs: [],
        activeTabId: null,
        view: "home",
        error: null,
      });
      return true;
    }

    const tabIndex = tabs.findIndex((tab) => tab.id === id);
    const nextTabs = tabs.filter((tab) => tab.id !== id);
    const fallbackTab = nextTabs[Math.max(0, tabIndex - 1)];

    set({
      tabs: nextTabs,
      activeTabId: id === activeTabId ? fallbackTab.id : activeTabId,
      view: nextTabs.length > 0 ? get().view : "home",
    });
    return true;
  },

  canCloseApp: async () => confirmDiscardTabs(get().tabs),

  clearError: () => set({ error: null }),
}));
