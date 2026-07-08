import { Suspense, useEffect, useRef } from "react";
import { EditorLoading } from "../editor/EditorLoading";
import { MarkdownEditor } from "../editor/Editor.lazy";
import { Home } from "../home/Home";
import { selectActiveTab, selectWorkspaceView, useDocumentStore } from "../../state/documentStore";
import { StatusBar } from "../editor/Editor.lazy";
import { TitleBar } from "./TitleBar";

export function AppShell() {
  const didInitialize = useRef(false);
  const activeTab = useDocumentStore(selectActiveTab);
  const view = useDocumentStore(selectWorkspaceView);
  const recentFiles = useDocumentStore((state) => state.recentFiles);
  const isBusy = useDocumentStore((state) => state.isBusy);
  const initializeWorkspace = useDocumentStore((state) => state.initializeWorkspace);
  const createDocument = useDocumentStore((state) => state.createDocument);
  const openDocument = useDocumentStore((state) => state.openDocument);
  const openDocumentFromPath = useDocumentStore((state) => state.openDocumentFromPath);
  const updateMarkdown = useDocumentStore((state) => state.updateMarkdown);
  const saveDocument = useDocumentStore((state) => state.saveDocument);
  const error = useDocumentStore((state) => state.error);
  const clearError = useDocumentStore((state) => state.clearError);

  useEffect(() => {
    if (didInitialize.current) return;
    didInitialize.current = true;
    void initializeWorkspace();
  }, [initializeWorkspace]);

  return (
    <div className="app-shell">
      <TitleBar />
      {error ? (
        <button className="error-banner" type="button" onClick={clearError}>
          {error}
        </button>
      ) : null}
      {view === "editor" && activeTab ? (
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
