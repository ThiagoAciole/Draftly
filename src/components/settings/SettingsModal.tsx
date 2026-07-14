import * as Dialog from "@radix-ui/react-dialog";
import { Code2, Download, Keyboard, Palette, Settings, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import { useSettings } from "../../contexts/SettingsContext";
import type { AppSettings } from "../../contexts/SettingsContext";
import { Toggle } from "../ui/Toggle";
import { SettingsSelect } from "../ui/SettingsSelect";
import { checkForAppUpdate, downloadAppUpdate } from "../../lib/updates";

const ACCENT_COLORS = [
  { value: "#8b6cff", label: "Roxo" },
  { value: "#6b7280", label: "Cinza" },
  { value: "#3b82f6", label: "Azul" },
  { value: "#22c55e", label: "Verde" },
  { value: "#eab308", label: "Amarelo" },
  { value: "#ef4444", label: "Vermelho" },
];

const FONT_OPTIONS: { value: AppSettings["appearance"]["editorFont"]; label: string }[] = [
  { value: "sans", label: "Sans-serif" },
  { value: "serif", label: "Serif" },
  { value: "mono", label: "Monospace" },
];

const FONT_SIZE_OPTIONS = [
  { value: 14, label: "14px" },
  { value: 16, label: "16px" },
  { value: 18, label: "18px" },
  { value: 20, label: "20px" },
  { value: 22, label: "22px" },
];

const CODE_FONT_SIZE_OPTIONS = [12, 13, 14, 15, 16, 18, 20].map((value) => ({ value, label: `${value}px` }));
const TAB_SIZE_OPTIONS = [
  { value: 2, label: "2 espaços" },
  { value: 4, label: "4 espaços" },
];

const SHORTCUTS = [
  { action: "Novo arquivo", key: "Ctrl+N" },
  { action: "Abrir", key: "Ctrl+O" },
  { action: "Salvar", key: "Ctrl+S" },
  { action: "Salvar como", key: "Ctrl+Shift+S" },
  { action: "Exportar PDF", key: "Ctrl+P" },
  { action: "Configurações", key: "Ctrl+," },
];

type TabId = "general" | "appearance" | "code" | "shortcuts";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "general", label: "Geral", icon: <Settings size={16} /> },
  { id: "code", label: "Código", icon: <Code2 size={16} /> },
  { id: "appearance", label: "Aparência", icon: <Palette size={16} /> },
  { id: "shortcuts", label: "Atalhos", icon: <Keyboard size={16} /> },
];

export function SettingsModal() {
  const { isSettingsOpen, closeSettings } = useWorkspace();
  const { settings, updateSetting, resetAll } = useSettings();
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateToast, setUpdateToast] = useState<string | null>(null);
  const updateToastTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (updateToastTimer.current !== null) window.clearTimeout(updateToastTimer.current);
  }, []);

  const handleReset = () => {
    void resetAll();
  };

  const showUpdateToast = (message: string) => {
    if (updateToastTimer.current !== null) window.clearTimeout(updateToastTimer.current);
    setUpdateToast(message);
    updateToastTimer.current = window.setTimeout(() => setUpdateToast(null), 4200);
  };

  const handleAppUpdate = async () => {
    setIsCheckingUpdate(true);

    try {
      const update = await checkForAppUpdate();
      if (update.status === "current") {
        showUpdateToast("O app já está atualizado.");
      } else if (update.status === "unpublished") {
        showUpdateToast("Ainda não há uma versão publicada para atualizar.");
      } else {
        await downloadAppUpdate(update.downloadUrl);
        showUpdateToast(`A versão ${update.version} será baixada pelo sistema.`);
      }
    } catch {
      showUpdateToast("Não foi possível verificar atualizações. Tente novamente.");
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  return (
    <Dialog.Root open={isSettingsOpen} onOpenChange={(open) => { if (!open) closeSettings(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="settings-overlay" />
        <Dialog.Content className="settings-content">
          <Dialog.Title asChild>
            <div className="settings-header">
              <span className="settings-title">Configurações</span>
              <Dialog.Close asChild>
                <button className="settings-close" type="button" aria-label="Fechar">
                  <X size={16} />
                </button>
              </Dialog.Close>
            </div>
          </Dialog.Title>
          <Dialog.Description className="sr-only">
            Ajuste as preferências de aparência, comportamento e atalhos do Draftly.
          </Dialog.Description>

          <div className="settings-layout">
            <nav className="settings-sidebar" role="tablist" aria-label="Abas de configurações">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  className={`settings-tab ${activeTab === tab.id ? "is-active" : ""}`}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>

            <div className="settings-body" role="tabpanel">
              {activeTab === "general" && (
                <div className="settings-group">
                  <p className="settings-group-title">Comportamento</p>
                  <div className="settings-row">
                    <div className="settings-row-label">
                      <span className="settings-row-title">Idioma</span>
                      <span className="settings-row-hint">Idioma da interface</span>
                    </div>
                    <SettingsSelect
                      value="pt-BR"
                      options={[{ value: "pt-BR", label: "Português (Brasil)" }]}
                      onChange={() => {}}
                      disabled
                    />
                  </div>
                  <div className="settings-row">
                    <div className="settings-row-label">
                      <span className="settings-row-title">Restaurar estado ao reabrir</span>
                      <span className="settings-row-hint">Reabre a última sessão</span>
                    </div>
                    <Toggle
                      checked={settings.general.restoreSession}
                      onChange={(v) => void updateSetting(["general", "restoreSession"], v)}
                      label="Restaurar estado ao reabrir"
                    />
                  </div>
                  <div className="settings-row">
                    <div className="settings-row-label">
                      <span className="settings-row-title">Mostrar arquivos recentes</span>
                      <span className="settings-row-hint">Exibe os arquivos recentes</span>
                    </div>
                    <Toggle
                      checked={settings.general.showRecentFiles}
                      onChange={(v) => void updateSetting(["general", "showRecentFiles"], v)}
                      label="Mostrar arquivos recentes"
                    />
                  </div>
                  <div className="settings-row">
                    <div className="settings-row-label">
                      <span className="settings-row-title">Salvamento automático</span>
                      <span className="settings-row-hint">Salva a cada 30 segundos</span>
                    </div>
                    <Toggle
                      checked={settings.general.autosave}
                      onChange={(v) => void updateSetting(["general", "autosave"], v)}
                      label="Salvamento automático"
                    />
                  </div>

                  <p className="settings-group-title" style={{ marginTop: 28 }}>
                    Atualizações
                  </p>
                  <div className="settings-row">
                    <div className="settings-row-label">
                      <span className="settings-row-title">Atualizar app</span>
                      <span className="settings-row-hint">Verifica a última versão publicada no GitHub</span>
                    </div>
                    <button
                      className="settings-update-button"
                      type="button"
                      onClick={() => void handleAppUpdate()}
                      disabled={isCheckingUpdate}
                    >
                      <Download size={15} />
                      {isCheckingUpdate ? "Verificando..." : "Verificar"}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === "appearance" && (
                <div className="settings-group">
                  <p className="settings-group-title">Tema</p>
                  <div className="settings-row">
                    <div className="settings-row-label">
                      <span className="settings-row-title">Tema</span>
                      <span className="settings-row-hint">Esquema de cores</span>
                    </div>
                    <SettingsSelect
                      value="dark"
                      options={[{ value: "dark", label: "Escuro" }]}
                      onChange={() => {}}
                      disabled
                    />
                  </div>
                  <div className="settings-row">
                    <div className="settings-row-label">
                      <span className="settings-row-title">Cor de Destaque</span>
                      <span className="settings-row-hint">Cor de destaque da interface</span>
                    </div>
                    <div className="settings-swatches">
                      {ACCENT_COLORS.map((color) => (
                        <button
                          key={color.value}
                          className={`settings-swatch ${settings.appearance.accentColor === color.value ? "is-selected" : ""}`}
                          type="button"
                          style={{ backgroundColor: color.value }}
                          aria-label={color.label}
                          title={color.label}
                          onClick={() => void updateSetting(["appearance", "accentColor"], color.value)}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="settings-row">
                    <div className="settings-row-label">
                      <span className="settings-row-title">Mostrar Abas</span>
                      <span className="settings-row-hint">Exibe a barra de abas</span>
                    </div>
                    <Toggle
                      checked={settings.appearance.showTabs}
                      onChange={(v) => void updateSetting(["appearance", "showTabs"], v)}
                      label="Mostrar Abas"
                    />
                  </div>

                  <p className="settings-group-title" style={{ marginTop: 28 }}>
                    Editor
                  </p>
                  <div className="settings-row">
                    <div className="settings-row-label">
                      <span className="settings-row-title">Fonte</span>
                      <span className="settings-row-hint">Família da fonte</span>
                    </div>
                    <SettingsSelect
                      value={settings.appearance.editorFont}
                      options={FONT_OPTIONS}
                      onChange={(v) => void updateSetting(["appearance", "editorFont"], v)}
                    />
                  </div>
                  <div className="settings-row">
                    <div className="settings-row-label">
                      <span className="settings-row-title">Tamanho</span>
                      <span className="settings-row-hint">Tamanho da fonte</span>
                    </div>
                    <SettingsSelect
                      value={settings.appearance.editorFontSize}
                      options={FONT_SIZE_OPTIONS}
                      onChange={(v) => void updateSetting(["appearance", "editorFontSize"], v)}
                      width={100}
                    />
                  </div>
                </div>
              )}

              {activeTab === "code" && (
                <div className="settings-group">
                  <p className="settings-group-title">Editor de código</p>
                  <div className="settings-row">
                    <div className="settings-row-label">
                      <span className="settings-row-title">Tamanho da fonte</span>
                      <span className="settings-row-hint">Tamanho do texto nos arquivos de código</span>
                    </div>
                    <SettingsSelect
                      value={settings.codeEditor.fontSize}
                      options={CODE_FONT_SIZE_OPTIONS}
                      onChange={(value) => void updateSetting(["codeEditor", "fontSize"], value)}
                      width={110}
                    />
                  </div>
                  <div className="settings-row">
                    <div className="settings-row-label">
                      <span className="settings-row-title">Tabulação</span>
                      <span className="settings-row-hint">Quantidade de espaços usada no recuo</span>
                    </div>
                    <SettingsSelect
                      value={settings.codeEditor.tabSize}
                      options={TAB_SIZE_OPTIONS}
                      onChange={(value) => void updateSetting(["codeEditor", "tabSize"], value)}
                      width={110}
                    />
                  </div>
                  <div className="settings-row">
                    <div className="settings-row-label">
                      <span className="settings-row-title">Quebra automática de linha</span>
                      <span className="settings-row-hint">Ajusta linhas longas à largura do editor</span>
                    </div>
                    <Toggle
                      checked={settings.codeEditor.wordWrap}
                      onChange={(value) => void updateSetting(["codeEditor", "wordWrap"], value)}
                      label="Quebra automática de linha"
                    />
                  </div>
                  <div className="settings-row">
                    <div className="settings-row-label">
                      <span className="settings-row-title">Números de linha</span>
                      <span className="settings-row-hint">Exibe a numeração ao lado do código</span>
                    </div>
                    <Toggle
                      checked={settings.codeEditor.showLineNumbers}
                      onChange={(value) => void updateSetting(["codeEditor", "showLineNumbers"], value)}
                      label="Números de linha"
                    />
                  </div>
                  <div className="settings-row">
                    <div className="settings-row-label">
                      <span className="settings-row-title">Autocomplete</span>
                      <span className="settings-row-hint">Mostra sugestões enquanto você digita</span>
                    </div>
                    <Toggle
                      checked={settings.codeEditor.autocomplete}
                      onChange={(value) => void updateSetting(["codeEditor", "autocomplete"], value)}
                      label="Autocomplete"
                    />
                  </div>
                  <div className="settings-row">
                    <div className="settings-row-label">
                      <span className="settings-row-title">Formatar ao salvar</span>
                      <span className="settings-row-hint">Formata arquivos compatíveis antes de gravar</span>
                    </div>
                    <Toggle
                      checked={settings.codeEditor.formatOnSave}
                      onChange={(value) => void updateSetting(["codeEditor", "formatOnSave"], value)}
                      label="Formatar ao salvar"
                    />
                  </div>
                </div>
              )}

              {activeTab === "shortcuts" && (
                <div className="settings-group">
                  <p className="settings-group-title">Atalhos de Teclado</p>
                  <table className="settings-shortcuts">
                    <thead>
                      <tr>
                        <th>Ação</th>
                        <th>Atalho</th>
                      </tr>
                    </thead>
                    <tbody>
                      {SHORTCUTS.map((s) => (
                        <tr key={s.action}>
                          <td>{s.action}</td>
                          <td>{s.key}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="settings-footer">
            <button className="settings-reset" type="button" onClick={handleReset}>
              Redefinir
            </button>
          </div>
          {updateToast ? <div className="settings-update-toast" role="status">{updateToast}</div> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
