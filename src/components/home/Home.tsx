import { FolderOpen, Plus } from "lucide-react";
import markdownFileIcon from "../../assets/file-markdown.png";
import type { RecentFile } from "../../contexts/TabsContext";

type HomeProps = {
  recentFiles: RecentFile[];
  isBusy: boolean;
  onCreate: () => void;
  onOpen: () => void;
  onOpenRecent: (path: string) => void;
  showRecentFiles?: boolean;
};

function getDirectory(path: string) {
  const parts = path.split(/[\\/]/);
  parts.pop();
  return parts.join("/") || path;
}

export function Home({ recentFiles, isBusy, onCreate, onOpen, onOpenRecent, showRecentFiles = true }: HomeProps) {
  return (
    <main className="home-view">
      <section className="home-panel" aria-label="Home">
        <div className="home-hero">
          <div className="home-mark" aria-hidden="true">
            <img src="/src/assets/icon.svg" alt="" />
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
              </div>
            )}
            {recentFiles.length > 0 ? (
              <div className="recent-files-list">
                {recentFiles.map((file) => (
                  <button
                    className="recent-file"
                    type="button"
                    key={file.path}
                    title={file.path}
                    onClick={() => onOpenRecent(file.path)}
                    disabled={isBusy}
                  >
                    <span className="recent-file-icon" aria-hidden="true">
                      <img src={markdownFileIcon} alt="" />
                    </span>
                    <span className="recent-file-info">
                      <span className="recent-file-name">{file.name}</span>
                      <span className="recent-file-path">{getDirectory(file.path)}</span>
                    </span>
                  </button>
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
