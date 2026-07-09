import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

export type WorkspaceView = "home" | "editor";

type WorkspaceState = {
  view: WorkspaceView;
  isBusy: boolean;
  error: string | null;
  isSettingsOpen: boolean;
};

type WorkspaceSetters = {
  setView: (view: WorkspaceView) => void;
  setIsBusy: (busy: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  openSettings: () => void;
  closeSettings: () => void;
};

type WorkspaceContextValue = WorkspaceState & WorkspaceSetters;

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<WorkspaceView>("home");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const clearError = () => setError(null);
  const openSettings = () => setIsSettingsOpen(true);
  const closeSettings = () => setIsSettingsOpen(false);

  return (
    <WorkspaceContext.Provider value={{ view, isBusy, error, isSettingsOpen, setView, setIsBusy, setError, clearError, openSettings, closeSettings }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return ctx;
}
