import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X } from "lucide-react";
import { useEffect, useRef } from "react";

const appWindow = getCurrentWindow();

type WindowControlsProps = {
  canCloseApp: () => Promise<boolean>;
};

export function WindowControls({ canCloseApp }: WindowControlsProps) {
  const isClosing = useRef(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    void appWindow.onCloseRequested(async (event) => {
      if (isClosing.current) {
        return;
      }

      event.preventDefault();

      if (await canCloseApp()) {
        isClosing.current = true;
        void appWindow.close();
      }
    }).then((handler) => {
      unlisten = handler;
    });

    return () => unlisten?.();
  }, [canCloseApp]);

  const closeWindow = async () => {
    if (await canCloseApp()) {
      isClosing.current = true;
      void appWindow.close();
    }
  };

  return (
    <div className="window-controls" role="group" aria-label="Controles da janela">
      <button
        className="window-control"
        type="button"
        aria-label="Minimizar"
        title="Minimizar"
        onClick={() => void appWindow.minimize()}
      >
        <Minus size={13} />
      </button>
      <button
        className="window-control"
        type="button"
        aria-label="Maximizar"
        title="Maximizar"
        onClick={() => void appWindow.toggleMaximize()}
      >
        <Square size={11} />
      </button>
      <button
        className="window-control is-close"
        type="button"
        aria-label="Fechar"
        title="Fechar"
        onClick={() => void closeWindow()}
      >
        <X size={13} />
      </button>
    </div>
  );
}
