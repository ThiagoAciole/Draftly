import { Eye, FileCode2 } from "lucide-react";
import { useWorkspace } from "../../contexts/WorkspaceContext";

export function EditorModeSwitch() {
  const { editorMode, setEditorMode } = useWorkspace();

  return (
    <div className="editor-mode-switch" role="tablist" aria-label="Modo de edição">
      <button
        className={`editor-mode-switch-button ${editorMode === "visual" ? "is-active" : ""}`}
        type="button"
        role="tab"
        aria-selected={editorMode === "visual"}
        title="Editor visual"
        onClick={() => setEditorMode("visual")}
      >
        <Eye size={16} />
        <span className="sr-only">Editor visual</span>
      </button>
      <button
        className={`editor-mode-switch-button ${editorMode === "source" ? "is-active" : ""}`}
        type="button"
        role="tab"
        aria-selected={editorMode === "source"}
        title="Markdown fonte"
        onClick={() => setEditorMode("source")}
      >
        <FileCode2 size={16} />
        <span className="sr-only">Markdown fonte</span>
      </button>
    </div>
  );
}
