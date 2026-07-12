import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import { getFileName } from "../lib/fs";
import { useWorkspace } from "./WorkspaceContext";

export type DocumentTab = {
  id: string;
  path: string | null;
  name: string;
  markdown: string;
  savedMarkdown: string;
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
    savedMarkdown: "",
    isDirty: false,
    lastSavedAt: null,
  });

  const addTab = (tab: DocumentTab) => {
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tab.id);
  };

  const updateActiveMarkdown = (markdown: string) => {
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabId
          ? { ...t, markdown, isDirty: markdown !== t.savedMarkdown }
          : t,
      ),
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
