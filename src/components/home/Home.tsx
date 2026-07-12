import { FolderOpen, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import markdownFileIcon from "../../assets/file-markdown.png";
import appIcon from "../../assets/icon.svg";
import type { RecentFile } from "../../contexts/TabsContext";

type HomeProps = {
  recentFiles: RecentFile[];
  isBusy: boolean;
  onCreate: () => void;
  onOpen: () => void;
  onOpenRecent: (path: string) => Promise<boolean>;
  onRemoveRecent: (path: string) => void;
  onClearRecent: () => void;
  showRecentFiles?: boolean;
};

function getDirectory(path: string) {
  const parts = path.split(/[\\/]/);
  parts.pop();
  return parts.join("/") || path;
}

export function Home({ recentFiles, isBusy, onCreate, onOpen, onOpenRecent, onRemoveRecent, onClearRecent, showRecentFiles = true }: HomeProps) {
  const [unavailablePath, setUnavailablePath] = useState<string | null>(null);

  const handleOpenRecent = async (path: string) => {
    const opened = await onOpenRecent(path);
    setUnavailablePath(opened ? null : path);
  };

  return (
    <main className="home-view">
      <section className="home-panel" aria-label="Home">
        <div className="home-hero">
          <div className="home-mark" aria-hidden="true">
            <img src={appIcon} alt="" />
          </div>

          <div className="home-actions">
            <button className="home-action is-primary" type="button" onClick={onOpen} disabled={isBusy}>
              <FolderOpen size={18} />
              <span>Abrir arquivo</span>
            </button>
            <button className="home-action is-secondary" type="button" onClick={onCreate}>
              <Plus size={18} />
              <span>Novo Arquivo</span>
            </button>
          </div>
        </div>

        {showRecentFiles ? (
          <div className="recent-files" aria-label="Arquivos recentes">
            {recentFiles.length > 0 && (
              <div className="recent-files-header">
                <span>Recentes</span>
                <button className="recent-files-clear" type="button" onClick={onClearRecent} disabled={isBusy}>
                  <Trash2 size={13} />
                  Limpar
                </button>
              </div>
            )}
            {recentFiles.length > 0 ? (
              <div className="recent-files-list">
                {recentFiles.map((file) => (
                  <div className="recent-file-row" key={file.path}>
                    <button
                      className="recent-file"
                      type="button"
                      title={file.path}
                      onClick={() => void handleOpenRecent(file.path)}
                      disabled={isBusy}
                    >
                      <span className="recent-file-icon" aria-hidden="true">
                        <img src={markdownFileIcon} alt="" />
                      </span>
                      <span className="recent-file-info">
                        <span className="recent-file-name">{file.name}</span>
                        <span className="recent-file-path">{getDirectory(file.path)}</span>
                        {unavailablePath === file.path ? <span className="recent-file-unavailable">Arquivo indisponível — remova dos recentes</span> : null}
                      </span>
                    </button>
                    <button
                      className="recent-file-remove"
                      type="button"
                      aria-label={`Remover ${file.name} dos recentes`}
                      title="Remover dos recentes"
                      onClick={() => onRemoveRecent(file.path)}
                      disabled={isBusy}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="recent-files-empty">Nenhum arquivo recente ainda</p>
            )}
          </div>
        ) : null}
      </section>
    </main>
  );
}
