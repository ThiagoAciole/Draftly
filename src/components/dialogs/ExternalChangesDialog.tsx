import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";

type ExternalChangesDialogProps = {
  fileName: string;
  localContent: string;
  diskContent: string;
  onKeep: () => void;
  onReload: () => void;
};

export function ExternalChangesDialog({ fileName, localContent, diskContent, onKeep, onReload }: ExternalChangesDialogProps) {
  const [isComparing, setIsComparing] = useState(false);

  return (
    <Dialog.Root open>
      <Dialog.Portal>
        <Dialog.Overlay className="unsaved-dialog-overlay" />
        <Dialog.Content className="external-changes-dialog" aria-describedby="external-changes-description">
          <Dialog.Title className="unsaved-dialog-title">Arquivo alterado fora do Draftly</Dialog.Title>
          <Dialog.Description id="external-changes-description" className="unsaved-dialog-description">
            <strong>{fileName}</strong> mudou no disco enquanto estava aberto.
          </Dialog.Description>
          {isComparing ? (
            <div className="external-changes-comparison">
              <section>
                <h3>Minha aba</h3>
                <pre>{localContent || "Arquivo vazio"}</pre>
              </section>
              <section>
                <h3>No disco</h3>
                <pre>{diskContent || "Arquivo vazio"}</pre>
              </section>
            </div>
          ) : null}
          <div className="unsaved-dialog-actions">
            <button className="unsaved-dialog-button" type="button" onClick={() => setIsComparing((visible) => !visible)}>
              {isComparing ? "Ocultar comparação" : "Comparar"}
            </button>
            <button className="unsaved-dialog-button" type="button" onClick={onKeep}>Manter minha aba</button>
            <button className="unsaved-dialog-button is-primary" type="button" onClick={onReload}>Recarregar do disco</button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
