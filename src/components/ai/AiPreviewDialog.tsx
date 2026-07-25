import * as Dialog from "@radix-ui/react-dialog";
import { Copy, X } from "lucide-react";
import { copyTextToClipboard } from "../../lib/clipboard";
import type { AiResult } from "../../lib/ai/types";
import { getTextDiff } from "../../lib/ai/diff";
import { IconButton } from "../ui/IconButton";

type Props = {
  title: string;
  result: AiResult | null;
  originalText?: string;
  isLoading?: boolean;
  onClose: () => void;
  onCancel?: () => void;
  onApply?: (text: string) => void;
  onRetry?: () => void;
  applyLabel?: string;
};

export function AiPreviewDialog({
  title,
  result,
  originalText = "",
  isLoading = false,
  onClose,
  onCancel,
  onApply,
  onRetry,
  applyLabel = "Substituir documento",
}: Props) {
  const text = result?.kind === "text" ? result.text : "";
  const diff = getTextDiff(originalText, text);
  const hasChanges = Boolean(diff.removed || diff.added);
  return (
    <Dialog.Root
      open={result !== null || isLoading}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Content className="ai-preview-bubble">
          <div className="settings-header">
            <Dialog.Title className="settings-title">{title}</Dialog.Title>
            <button className="settings-close" onClick={isLoading && onCancel ? onCancel : onClose} aria-label={isLoading && onCancel ? "Cancelar" : "Fechar"}>
              <X size={16} />
            </button>
          </div>
          <div className="settings-body ai-preview-content">
            {isLoading ? (
              <div className="ai-preview-loading" role="status">Gerando…</div>
            ) : hasChanges ? (
              <div className="ai-diff-preview" aria-label="Prévia das alterações">
                <p>Prévia das alterações</p>
                <pre>
                  {diff.before}
                  {diff.removed ? <del>{diff.removed}</del> : null}
                  {diff.added ? <ins>{diff.added}</ins> : null}
                  {diff.after}
                </pre>
              </div>
            ) : <pre>{text}</pre>}
          </div>
          <div className="settings-footer">
            {isLoading && onCancel ? <button className="ai-preview-action is-cancel" type="button" onClick={onCancel}>Cancelar geração</button> : null}
            {text ? <IconButton className="ai-preview-copy" label="Copiar resultado" onClick={() => void copyTextToClipboard(text)} disabled={isLoading}>
                <Copy size={14} />
              </IconButton> : null}
            {text && onRetry ? <button className="ai-preview-action" type="button" onClick={onRetry} disabled={isLoading}>Repetir</button> : null}
            {text && onApply ? (
              <button
                className="ai-preview-action is-primary"
                disabled={isLoading}
                onClick={() => {
                  onApply(text);
                  onClose();
                }}
              >
                {applyLabel}
              </button>
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
