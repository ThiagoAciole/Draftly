import { t } from "../utils/i18n.js";
import { settings } from "./settings.svelte.js";
import type { DocumentSnapshot } from "../services/document-session.js";
import {
  isMarkdownPath,
  isPlainTextPath,
  isHtmlPath,
} from "../features/files/file-types.js";

export interface Tab {
  id: string;
  path: string;
  title: string;
  content: string;
  rawContent: string;
  originalContent: string;
  scrollTop: number;
  isDirty: boolean;
  isEditing: boolean;
  navigationHistory: string[];
  navigationIndex: number;
  editorViewState: any; // monaco.editor.ICodeEditorViewState | null
  scrollPercentage: number;
  anchorLine: number;
  isSplit: boolean;
  splitRatio: number;
  isScrollSynced: boolean;
  newFileType?: NewFileType;
}

export type NewFileType = "markdown" | "json" | "text";

class TabManager {
  tabs = $state<Tab[]>([]);
  activeTabId = $state<string | null>(null);
  splitScrollSyncPreference = $state(false);

  constructor() {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("editor.splitScrollSync");
      if (saved !== null) {
        this.splitScrollSyncPreference = saved === "true";
      }
    }
  }

  private saveSplitScrollSyncPreference() {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(
        "editor.splitScrollSync",
        String(this.splitScrollSyncPreference),
      );
    }
  }

  get activeTab() {
    return this.tabs.find((t) => t.id === this.activeTabId);
  }

  serializeState(): string {
    const stateData = {
      activeTabId: this.activeTabId,
      tabs: this.tabs.map((t) => ({
        ...t,
        editorViewState: null,
        content: "",
      })),
    };
    return JSON.stringify(stateData);
  }

  restoreState(jsonBuffer: string) {
    try {
      const data = JSON.parse(jsonBuffer);
      if (data && Array.isArray(data.tabs)) {
        this.tabs = data.tabs.map((tab: Tab) => {
          if (
            tab.path === "" &&
            tab.newFileType &&
            tab.newFileType !== "markdown"
          ) {
            return {
              ...tab,
              isSplit: false,
              isEditing: true,
            };
          }
          if (isPlainTextPath(tab.path)) {
            return {
              ...tab,
              isSplit: false,
              isEditing: true,
            };
          }
          if (!isMarkdownPath(tab.path) && !isHtmlPath(tab.path)) return tab;

          return {
            ...tab,
            isSplit: false,
            isEditing: tab.isEditing ?? false,
            splitRatio: 0.5,
          };
        });
        this.activeTabId = data.activeTabId;
      }
    } catch (e) {
      console.error("Failed to restore tab state", e);
    }
  }

  addTab(path: string, content: string = "") {
    const id = crypto.randomUUID();
    const filename =
      path.split("\\").pop()?.split("/").pop() ||
      t("tabs.untitled", settings.language);
    const opensInSplit = false;

    this.tabs.push({
      id,
      path,
      title: filename,
      content,
      rawContent: content,
      originalContent: content,
      scrollTop: 0,
      isDirty: false,
      isEditing: false,
      navigationHistory: [path],
      navigationIndex: 0,
      editorViewState: null,
      scrollPercentage: 0,
      anchorLine: 0,
      isSplit: opensInSplit,
      splitRatio: 0.6,
      isScrollSynced: false,
    });

    this.activeTabId = id;
  }

  addNewTab(type: NewFileType = "markdown") {
    const id = crypto.randomUUID();
    const content = "";
    const extension =
      type === "markdown" ? "md" : type === "json" ? "json" : "txt";

    this.tabs.push({
      id,
      path: "",
      title: `${t("tabs.untitled", settings.language)}.${extension}`,
      content,
      rawContent: content,
      originalContent: content,
      scrollTop: 0,
      isDirty: false,
      isEditing: type !== "markdown",
      navigationHistory: [""],
      navigationIndex: 0,
      editorViewState: null,
      scrollPercentage: 0,
      anchorLine: 0,
      isSplit: false,
      splitRatio: 0.5,
      isScrollSynced: false,
      newFileType: type,
    });

    this.activeTabId = id;
  }

  addRecoveredTab(snapshot: DocumentSnapshot) {
    const id = crypto.randomUUID();
    const isMarkdown = isMarkdownPath(snapshot.path);
    const opensInSplit = isMarkdown || isHtmlPath(snapshot.path);
    this.tabs.push({
      id,
      path: "",
      title: `Recovered - ${snapshot.title}`,
      content: "",
      rawContent: snapshot.content,
      originalContent: "",
      scrollTop: 0,
      isDirty: true,
      isEditing: true,
      navigationHistory: [""],
      navigationIndex: 0,
      editorViewState: null,
      scrollPercentage: 0,
      anchorLine: 0,
      isSplit: opensInSplit,
      splitRatio: opensInSplit ? 0.6 : 0.5,
      isScrollSynced: false,
      newFileType: isMarkdown ? "markdown" : "text",
    });
    this.activeTabId = id;
  }

  addHomeTab() {
    const homeTab = this.tabs.find((t) => t.path === "HOME");
    if (homeTab) {
      this.activeTabId = homeTab.id;
      return;
    }

    const id = crypto.randomUUID();
    this.tabs.push({
      id,
      path: "HOME",
      title: t("tabs.home", settings.language),
      content: "",
      rawContent: "",
      originalContent: "",
      scrollTop: 0,
      isDirty: false,
      isEditing: false,
      navigationHistory: ["HOME"],
      navigationIndex: 0,
      editorViewState: null,
      scrollPercentage: 0,
      anchorLine: 0,
      isSplit: false,
      splitRatio: 0.5,
      isScrollSynced: false,
    });

    this.activeTabId = id;
  }

  closeTab(id: string) {
    const index = this.tabs.findIndex((t) => t.id === id);
    if (index === -1) return;

    if (this.activeTabId === id) {
      const fallback = this.tabs[index + 1] || this.tabs[index - 1];
      this.activeTabId = fallback ? fallback.id : null;
    }

    const tab = this.tabs[index];
    if (tab.path && tab.path !== "HOME") {
      this.recentlyClosed.push(tab.path);
    }
    this.tabs.splice(index, 1);
  }

  closeAll() {
    this.tabs = [];
    this.activeTabId = null;
  }

  setActive(id: string) {
    this.activeTabId = id;
  }

  updateTabContent(id: string, content: string) {
    const tab = this.tabs.find((t) => t.id === id);
    if (tab) {
      tab.content = content;
    }
  }

  updateTabRawContent(id: string, raw: string) {
    const tab = this.tabs.find((t) => t.id === id);
    if (tab) {
      tab.rawContent = raw;
      tab.isDirty = tab.rawContent !== tab.originalContent;
    }
  }

  setTabRawContent(id: string, raw: string) {
    const tab = this.tabs.find((t) => t.id === id);
    if (tab) {
      tab.rawContent = raw;
      tab.originalContent = raw;
      tab.isDirty = false;
    }
  }

  updateTabScroll(id: string, scrollTop: number) {
    const tab = this.tabs.find((t) => t.id === id);
    if (tab) {
      tab.scrollTop = scrollTop;
    }
  }

  updateTabEditorState(id: string, viewState: any) {
    const tab = this.tabs.find((t) => t.id === id);
    if (tab) {
      tab.editorViewState = viewState;
    }
  }

  updateTabScrollPercentage(id: string, percentage: number) {
    const tab = this.tabs.find((t) => t.id === id);
    if (tab) {
      tab.scrollPercentage = percentage;
    }
  }

  updateTabAnchorLine(id: string, line: number) {
    const tab = this.tabs.find((t) => t.id === id);
    if (tab) {
      tab.anchorLine = line;
    }
  }

  toggleSplit(id: string) {
    const tab = this.tabs.find((t) => t.id === id);
    if (tab) {
      this.setSplitEnabled(id, !tab.isSplit);
    }
  }

  setEditing(id: string, isEditing: boolean) {
    const tab = this.tabs.find((t) => t.id === id);
    if (tab) {
      tab.isEditing = isEditing;
    }
  }

  setSplitEnabled(id: string, enabled: boolean) {
    const tab = this.tabs.find((t) => t.id === id);
    if (!tab) return;

    tab.isSplit = enabled;
    if (enabled) {
      tab.isScrollSynced = this.splitScrollSyncPreference;
    } else {
      this.splitScrollSyncPreference = tab.isScrollSynced;
      this.saveSplitScrollSyncPreference();
    }
  }

  setSplitRatio(id: string, ratio: number) {
    const tab = this.tabs.find((t) => t.id === id);
    if (tab) {
      tab.splitRatio = Math.max(0.1, Math.min(0.9, ratio));
    }
  }

  toggleScrollSync(id: string) {
    const tab = this.tabs.find((t) => t.id === id);
    if (tab) {
      tab.isScrollSynced = !tab.isScrollSynced;
      this.splitScrollSyncPreference = tab.isScrollSynced;
      this.saveSplitScrollSyncPreference();
    }
  }

  reorderTabs(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;
    const [moved] = this.tabs.splice(fromIndex, 1);
    this.tabs.splice(toIndex, 0, moved);
  }

  cycleTab(direction: "next" | "prev") {
    if (this.tabs.length < 2) return;
    const currentIndex = this.tabs.findIndex((t) => t.id === this.activeTabId);
    if (currentIndex === -1) return;

    let nextIndex: number;
    if (direction === "next") {
      nextIndex = (currentIndex + 1) % this.tabs.length;
    } else {
      nextIndex = (currentIndex - 1 + this.tabs.length) % this.tabs.length;
    }
    this.activeTabId = this.tabs[nextIndex].id;
  }

  updateTabPath(id: string, path: string) {
    const tab = this.tabs.find((t) => t.id === id);
    if (tab) {
      tab.path = path;
      tab.title = path.split(/[/\\]/).pop() || "Untitled";
      tab.isDirty = false;
      tab.newFileType = undefined;
      if (isMarkdownPath(path) || isHtmlPath(path)) {
        tab.isSplit = true;
        if (tab.splitRatio === 0.5) tab.splitRatio = 0.6;
      } else {
        tab.isSplit = false;
        tab.isEditing = true;
      }
      if (tab.navigationHistory.length > 0) {
        tab.navigationHistory[tab.navigationIndex] = path;
      } else {
        tab.navigationHistory = [path];
        tab.navigationIndex = 0;
      }
    }
  }

  renameTab(id: string, newPath: string) {
    const tab = this.tabs.find((t) => t.id === id);
    if (tab) {
      tab.path = newPath;
      tab.title = newPath.split(/[/\\]/).pop() || "Untitled";
      if (tab.navigationHistory.length > 0) {
        tab.navigationHistory[tab.navigationIndex] = newPath;
      }
    }
  }

  navigate(id: string, path: string) {
    const tab = this.tabs.find((t) => t.id === id);
    if (tab) {
      if (tab.path === path) return;

      tab.navigationHistory = tab.navigationHistory.slice(
        0,
        tab.navigationIndex + 1,
      );
      tab.navigationHistory.push(path);
      tab.navigationIndex++;

      tab.path = path;
      tab.title = path.split(/[/\\]/).pop() || "Untitled";
      tab.isDirty = false;
      tab.scrollTop = 0;
    }
  }

  canGoBack(id: string): boolean {
    const tab = this.tabs.find((t) => t.id === id);
    return tab ? tab.navigationIndex > 0 : false;
  }

  canGoForward(id: string): boolean {
    const tab = this.tabs.find((t) => t.id === id);
    return tab ? tab.navigationIndex < tab.navigationHistory.length - 1 : false;
  }

  goBack(id: string): string | null {
    const tab = this.tabs.find((t) => t.id === id);
    if (tab && tab.navigationIndex > 0) {
      tab.navigationIndex--;
      const path = tab.navigationHistory[tab.navigationIndex];
      tab.path = path;
      tab.title = path.split(/[/\\]/).pop() || "Untitled";
      tab.isDirty = false;
      return path;
    }
    return null;
  }

  goForward(id: string): string | null {
    const tab = this.tabs.find((t) => t.id === id);
    if (tab && tab.navigationIndex < tab.navigationHistory.length - 1) {
      tab.navigationIndex++;
      const path = tab.navigationHistory[tab.navigationIndex];
      tab.path = path;
      tab.title = path.split(/[/\\]/).pop() || "Untitled";
      tab.isDirty = false;
      return path;
    }
    return null;
  }

  recentlyClosed = $state<string[]>([]);

  popRecentlyClosed() {
    return this.recentlyClosed.pop();
  }
}

export const tabManager = new TabManager();
