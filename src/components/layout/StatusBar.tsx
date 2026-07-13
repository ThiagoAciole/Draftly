import { useTabsContext } from "../../contexts/TabsContext";

export function StatusBar() {
  const { activeTab } = useTabsContext();
  if (!activeTab) return null;

  const status = activeTab.isDirty
    ? "Alterações não salvas"
    : activeTab.lastSavedAt
      ? `Salvo ${activeTab.lastSavedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
      : "Pronto";

  return (
    <footer className="status-bar">
      <span>{status}</span>
      <span>{activeTab.language === "html" ? "HTML" : activeTab.language === "json" ? "JSON" : activeTab.language === "javascript" ? "JavaScript" : activeTab.language === "typescript" ? "TypeScript" : activeTab.language === "python" ? "Python" : "Markdown"}</span>
      <span>UTF-8</span>
      <span className="status-path">{activeTab.path || "Arquivo novo"}</span>
    </footer>
  );
}
