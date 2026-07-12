import * as Dialog from "@radix-ui/react-dialog";
import { Command } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

export type CommandAction = {
  id: string;
  label: string;
  shortcut?: string;
  icon: ReactNode;
  disabled?: boolean;
  run: () => void;
};

type CommandPaletteProps = {
  actions: CommandAction[];
  onClose: () => void;
};

export function CommandPalette({ actions, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const matches = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    return normalized ? actions.filter((action) => action.label.toLocaleLowerCase("pt-BR").includes(normalized)) : actions;
  }, [actions, query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="command-palette-overlay" />
        <Dialog.Content className="command-palette-content">
          <Dialog.Title className="sr-only">Paleta de comandos</Dialog.Title>
          <div className="command-palette-input-wrap">
            <Command size={17} />
            <input
              ref={inputRef}
              className="command-palette-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Digite um comando..."
            />
          </div>
          <div className="command-palette-list" role="listbox" aria-label="Comandos">
            {matches.map((action) => (
              <button
                className="command-palette-item"
                disabled={action.disabled}
                key={action.id}
                role="option"
                type="button"
                onClick={() => { action.run(); onClose(); }}
              >
                <span className="command-palette-icon">{action.icon}</span>
                <span>{action.label}</span>
                {action.shortcut ? <kbd>{action.shortcut}</kbd> : null}
              </button>
            ))}
            {matches.length === 0 ? <p className="command-palette-empty">Nenhum comando encontrado</p> : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
