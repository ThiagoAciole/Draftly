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
  const { initializeWorkspace, createDocument, openDocument, openDocumentFromPath, saveDocument } =
    useFileActions();

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
