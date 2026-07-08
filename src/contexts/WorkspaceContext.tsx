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
