import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { BlockNoteEditor } from "@blocknote/core";
import { Sparkles } from "lucide-react";
import { getAiInputLimit, startGeminiAction, type GeminiActionRequest } from "../../lib/ai/client";
import { useSettings } from "../../contexts/SettingsContext";
import type { AiAction, AiResult } from "../../lib/ai/types";
import { AiPreviewDialog } from "./AiPreviewDialog";

export function AiSelectionMenu({
  editor,
  onError,
}: {
  editor: BlockNoteEditor<any, any, any>;
  onError: (message: string) => void;
}) {
  const { settings } = useSettings();
  const [selection, setSelection] = useState("");
  const [position, setPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const [result, setResult] = useState<AiResult | null>(null);
  const [title, setTitle] = useState("");
  const [lastAction, setLastAction] = useState<{ action: AiAction; label: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const selectionRange = useRef<{ from: number; to: number } | null>(null);
  const activeRequest = useRef<GeminiActionRequest | null>(null);
  const formatLimit = getAiInputLimit("format");
  const exceedsTextLimit = selection.length > getAiInputLimit("rewrite");
  const exceedsFormatLimit = selection.length > formatLimit;
  useEffect(() => {
    const update = () => {
      const selected = window.getSelection();
      if (
        !selected ||
        selected.isCollapsed ||
        !editor.domElement?.contains(selected.anchorNode)
      ) {
        setPosition(null);
        return;
      }
      const range = selected.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelection(selected.toString());
      setPosition({ left: rect.left + rect.width / 2, top: rect.top - 8 });
    };
    document.addEventListener("selectionchange", update);
    return () => document.removeEventListener("selectionchange", update);
  }, [editor]);
  const run = async (action: AiAction, label: string) => {
    let request: GeminiActionRequest | null = null;
    try {
      if (!settings.ai.enabled) throw new Error("Ative a IA nas configurações.");
      setTitle(label);
      setLastAction({ action, label });
      selectionRange.current = editor._tiptapEditor.state.selection;
      request = startGeminiAction(action, selection, settings.ai.model);
      activeRequest.current = request;
      setIsLoading(true);
      const nextResult = await request.promise;
      if (activeRequest.current === request) setResult(nextResult);
    } catch (error) {
      if (request && activeRequest.current === request) onError(error instanceof Error ? error.message : "Não foi possível usar a IA.");
    } finally {
      if (request && activeRequest.current === request) {
        activeRequest.current = null;
        setIsLoading(false);
      }
    }
  };
  const cancel = () => {
    const request = activeRequest.current;
    activeRequest.current = null;
    setIsLoading(false);
    setResult(null);
    if (request) void request.cancel().catch(() => undefined);
  };
  const replace = (text: string) => {
    const selection = selectionRange.current ?? editor._tiptapEditor.state.selection;
    editor._tiptapEditor.commands.insertContentAt(
      { from: selection.from, to: selection.to },
      text,
    );
  };
  return (
    <>
      {position
        ? createPortal(
            <div
              className="ai-selection-menu"
              style={{ left: position.left, top: position.top }}
              role="toolbar"
              aria-label="Ações de IA para o texto selecionado"
            >
              <span className="ai-selection-menu-icon">
                <Sparkles size={14} />
              </span>
              <span className={`ai-selection-menu-count ${exceedsFormatLimit ? "is-limit" : ""}`}>{selection.length.toLocaleString("pt-BR")}/{formatLimit.toLocaleString("pt-BR")}</span>
              {isLoading ? <span className="ai-selection-menu-loading">Gerando…</span> : <>
              <button
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => void run("rewrite", "Reescrever")}
                disabled={exceedsTextLimit}
                title={exceedsTextLimit ? "Selecione até 6.000 caracteres para reescrever." : undefined}
              >
                Reescrever
              </button>
              <button
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => void run("correct", "Corrigir com IA")}
                disabled={exceedsTextLimit}
                title={exceedsTextLimit ? "Selecione até 6.000 caracteres para corrigir." : undefined}
              >
                Corrigir
              </button>
              <button
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => void run("format", "Formatar seleção")}
                disabled={exceedsFormatLimit}
              >
                Formatar
              </button>
              </>}
            </div>,
            document.body,
          )
        : null}
      <AiPreviewDialog
        title={title}
        result={result}
        originalText={selection}
        isLoading={isLoading}
        onClose={() => setResult(null)}
        onCancel={cancel}
        onApply={result?.kind === "text" ? replace : undefined}
        onRetry={lastAction ? () => void run(lastAction.action, lastAction.label) : undefined}
        applyLabel="Substituir seleção"
      />
    </>
  );
}
