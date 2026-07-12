import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

export type WorkspaceView = "home" | "editor";
export type EditorMode = "visual" | "source";

type WorkspaceState = {
  view: WorkspaceView;
  isBusy: boolean;
  error: string | null;
  isSettingsOpen: boolean;
  isSearchOpen: boolean;
  editorMode: EditorMode;
};

type WorkspaceSetters = {
  setView: (view: WorkspaceView) => void;
  setIsBusy: (busy: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  openSearch: () => void;
  closeSearch: () => void;
  setEditorMode: (mode: EditorMode) => void;
  toggleEditorMode: () => void;
};

type WorkspaceContextValue = WorkspaceState & WorkspaceSetters;

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<WorkspaceView>("home");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>("visual");

  const clearError = () => setError(null);
  const openSettings = () => setIsSettingsOpen(true);
  const closeSettings = () => setIsSettingsOpen(false);
  const openSearch = () => setIsSearchOpen(true);
  const closeSearch = () => setIsSearchOpen(false);
  const toggleEditorMode = () => {
    setIsSearchOpen(false);
    setEditorMode((mode) => (mode === "visual" ? "source" : "visual"));
  };

  return (
    <WorkspaceContext.Provider value={{ view, isBusy, error, isSettingsOpen, isSearchOpen, editorMode, setView, setIsBusy, setError, clearError, openSettings, closeSettings, openSearch, closeSearch, setEditorMode, toggleEditorMode }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return ctx;
}
