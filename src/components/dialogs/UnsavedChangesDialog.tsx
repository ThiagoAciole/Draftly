import * as Dialog from "@radix-ui/react-dialog";

type UnsavedChangesDialogProps = {
  tabs: Array<{ id: string; name: string }>;
  isSaving: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
};

export function UnsavedChangesDialog({
  tabs,
  isSaving,
  onSave,
  onDiscard,
  onCancel,
}: UnsavedChangesDialogProps) {
  const fileLabel = tabs.length === 1 ? `"${tabs[0].name}"` : `${tabs.length} arquivos`;

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open && !isSaving) onCancel(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="unsaved-dialog-overlay" />
        <Dialog.Content className="unsaved-dialog-content" onEscapeKeyDown={(event) => {
          if (isSaving) event.preventDefault();
        }}>
          <Dialog.Title className="unsaved-dialog-title">Alterações não salvas</Dialog.Title>
          <Dialog.Description className="unsaved-dialog-description">
            {`Deseja salvar as alterações em ${fileLabel} antes de continuar?`}
          </Dialog.Description>
          {tabs.length > 1 ? (
            <ul className="unsaved-dialog-files" aria-label="Arquivos com alterações não salvas">
              {tabs.map((tab) => <li key={tab.id}>{tab.name}</li>)}
            </ul>
          ) : null}
          <div className="unsaved-dialog-actions">
            <button className="unsaved-dialog-button" type="button" disabled={isSaving} onClick={onCancel}>
              Cancelar
            </button>
            <button className="unsaved-dialog-button is-danger" type="button" disabled={isSaving} onClick={onDiscard}>
              Descartar
            </button>
            <button className="unsaved-dialog-button is-primary" type="button" disabled={isSaving} onClick={onSave}>
              {isSaving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
