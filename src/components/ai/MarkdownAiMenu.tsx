import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { getAiInputLimit, startGeminiAction, type GeminiActionRequest } from "../../lib/ai/client";
import type { AiAction, AiResult } from "../../lib/ai/types";
import { useSettings } from "../../contexts/SettingsContext";
import { AiPreviewDialog } from "./AiPreviewDialog";

type Props = {
  content: string;
  onApply: (content: string) => void;
  onError: (message: string) => void;
};
const actions: Array<{ action: AiAction; label: string }> = [
  { action: "format", label: "Formatar com IA" },
  { action: "correct", label: "Corrigir com IA" },
];
export function MarkdownAiMenu({ content, onApply, onError }: Props) {
  const { settings } = useSettings();
  const [result, setResult] = useState<AiResult | null>(null);
  const [title, setTitle] = useState("");
  const [lastAction, setLastAction] = useState<{ action: AiAction; label: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const activeRequest = useRef<GeminiActionRequest | null>(null);
  const isTooLargeToFormat = content.length > getAiInputLimit("format");
  const run = async (action: AiAction, label: string) => {
    let request: GeminiActionRequest | null = null;
    try {
      if (!settings.ai.enabled)
        throw new Error("Ative a IA nas configurações.");
      setTitle(label);
      setLastAction({ action, label });
      request = startGeminiAction(action, content, settings.ai.model);
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
  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            className="titlebar-button titlebar-compact-action"
            type="button"
            aria-label="Ferramentas de IA"
            title="Ferramentas de IA"
            disabled={isLoading}
          >
            <Sparkles size={16} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="title-menu-content"
            align="end"
            sideOffset={8}
          >
            {actions.map(({ action, label }) => (
              <DropdownMenu.Item
                key={action}
                className="title-menu-item"
                onSelect={() => void run(action, label)}
                disabled={isLoading || (action === "format" && isTooLargeToFormat)}
              >
                {label}
              </DropdownMenu.Item>
            ))}
            {isTooLargeToFormat ? <p className="ai-menu-hint">Selecione um trecho para formatá-lo com IA.</p> : null}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      <AiPreviewDialog
        title={title}
        result={result}
        originalText={content}
        isLoading={isLoading}
        onClose={() => setResult(null)}
        onCancel={cancel}
        onApply={result?.kind === "text" ? onApply : undefined}
        onRetry={lastAction ? () => void run(lastAction.action, lastAction.label) : undefined}
      />
    </>
  );
}
