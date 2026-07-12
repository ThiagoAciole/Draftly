import * as Dialog from "@radix-ui/react-dialog";
import type { VersionSnapshot } from "../../lib/versionHistory";

type VersionHistoryDialogProps = {
  snapshots: VersionSnapshot[];
  onClose: () => void;
  onRestore: (snapshot: VersionSnapshot) => void;
};

export function VersionHistoryDialog({ snapshots, onClose, onRestore }: VersionHistoryDialogProps) {
  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="unsaved-dialog-overlay" />
        <Dialog.Content className="version-history-dialog">
          <Dialog.Title className="unsaved-dialog-title">Histórico de versões</Dialog.Title>
          <Dialog.Description className="unsaved-dialog-description">
            Restaurar uma versão substitui o conteúdo atual na aba e deixa o arquivo pendente para salvar.
          </Dialog.Description>
          {snapshots.length > 0 ? (
            <div className="version-history-list">
              {snapshots.map((snapshot) => (
                <div className="version-history-item" key={snapshot.id}>
                  <div>
                    <strong>{new Date(snapshot.createdAt).toLocaleString("pt-BR")}</strong>
                    <p>{snapshot.content.slice(0, 120) || "Arquivo vazio"}</p>
                  </div>
                  <button className="unsaved-dialog-button is-primary" type="button" onClick={() => onRestore(snapshot)}>
                    Restaurar
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="version-history-empty">Nenhuma versão anterior disponível ainda.</p>
          )}
          <div className="unsaved-dialog-actions">
            <button className="unsaved-dialog-button" type="button" onClick={onClose}>Fechar</button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
