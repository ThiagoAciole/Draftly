import * as Dialog from "@radix-ui/react-dialog";
import { Keyboard, Palette, Settings, X } from "lucide-react";
import { useState } from "react";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import { useSettings } from "../../contexts/SettingsContext";
import type { AppSettings } from "../../contexts/SettingsContext";
import { Toggle } from "../ui/Toggle";

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

const FONT_SIZE_OPTIONS = [14, 16, 18, 20, 22];

const SHORTCUTS = [
  { action: "Novo arquivo", key: "Ctrl+N" },
  { action: "Abrir", key: "Ctrl+O" },
  { action: "Salvar", key: "Ctrl+S" },
  { action: "Salvar como", key: "Ctrl+Shift+S" },
  { action: "Exportar PDF", key: "Ctrl+P" },
  { action: "Configurações", key: "Ctrl+," },
];

type TabId = "general" | "appearance" | "shortcuts";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "general", label: "Geral", icon: <Settings size={16} /> },
  { id: "appearance", label: "Aparência", icon: <Palette size={16} /> },
  { id: "shortcuts", label: "Atalhos", icon: <Keyboard size={16} /> },
];

export function SettingsModal() {
  const { isSettingsOpen, closeSettings } = useWorkspace();
  const { settings, updateSetting, resetAll } = useSettings();
  const [activeTab, setActiveTab] = useState<TabId>("general");

  const handleReset = () => {
    void resetAll();
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
                    <select className="settings-select" disabled defaultValue="pt-BR">
                      <option value="pt-BR">Português (Brasil)</option>
                    </select>
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
                    <select className="settings-select" disabled defaultValue="dark">
                      <option value="dark">Escuro</option>
                    </select>
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
                    <select
                      className="settings-select"
                      value={settings.appearance.editorFont}
                      onChange={(e) => void updateSetting(["appearance", "editorFont"], e.target.value)}
                    >
                      {FONT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="settings-row">
                    <div className="settings-row-label">
                      <span className="settings-row-title">Tamanho</span>
                      <span className="settings-row-hint">Tamanho da fonte</span>
                    </div>
                    <select
                      className="settings-select"
                      style={{ minWidth: 100 }}
                      value={settings.appearance.editorFontSize}
                      onChange={(e) => void updateSetting(["appearance", "editorFontSize"], Number(e.target.value))}
                    >
                      {FONT_SIZE_OPTIONS.map((size) => (
                        <option key={size} value={size}>
                          {size}px
                        </option>
                      ))}
                    </select>
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
