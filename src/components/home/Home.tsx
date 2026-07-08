import { FileText, FolderOpen, Plus } from "lucide-react";
import type { RecentFile } from "../../contexts/TabsContext";

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
        <div className="home-actions">
          <button className="home-action is-primary" type="button" onClick={onCreate}>
            <Plus size={18} />
            <span>Novo arquivo</span>
          </button>
          <button className="home-action is-secondary" type="button" onClick={onOpen} disabled={isBusy}>
            <FolderOpen size={18} />
            <span>Abrir</span>
          </button>
        </div>

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
                    <FileText size={16} />
                  </span>
                  <span className="recent-file-name">{file.name}</span>
                  <span className="recent-file-path">{getDirectory(file.path)}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="recent-files-empty">Nenhum arquivo recente ainda</p>
          )}
        </div>
      </section>
    </main>
  );
}
