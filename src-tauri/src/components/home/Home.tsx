import { FileText, FolderOpen, Plus } from "lucide-react";
import type { RecentFile } from "../../state/documentStore";

type HomeProps = {
  recentFiles: RecentFile[];
  isBusy: boolean;
  onCreate: () => void;
  onOpen: () => void;
  onOpenRecent: (path: string) => void;
};

function getDirectory(path: string) {
  const parts = path.split(/[\\/]/);
  parts.pop();
  return parts.join("/") || path;
}

export function Home({ recentFiles, isBusy, onCreate, onOpen, onOpenRecent }: HomeProps) {
  return (
    <main className="home-view">
      <section className="home-panel" aria-label="Home">
        <img className="home-mark" src="/src/assets/icon.svg" alt="" aria-hidden="true" />

        <div className="home-actions">
          <button className="home-action is-secondary" type="button" onClick={onOpen} disabled={isBusy}>
            <FolderOpen size={16} />
            <span>Abrir arquivo</span>
          </button>
          <button className="home-action is-primary" type="button" onClick={onCreate}>
            <Plus size={16} />
            <span>Novo arquivo</span>
          </button>
        </div>

        <div className="recent-files" aria-label="Arquivos recentes">
          <h1>Arquivos recentes</h1>

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
                    <FileText size={17} />
                  </span>
                  <span className="recent-file-content">
                    <span className="recent-file-name">{file.name}</span>
                    <span className="recent-file-path">{getDirectory(file.path)}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="recent-files-empty">Nenhum arquivo recente ainda.</p>
          )}
        </div>
      </section>
    </main>
  );
}
