import { SettingsProvider } from "../contexts/SettingsContext";
import { WorkspaceProvider } from "../contexts/WorkspaceContext";
import { TabsProvider } from "../contexts/TabsContext";
import { FileActionsProvider } from "../contexts/FileActionsContext";
import { AppShell } from "../components/layout/AppShell";

export function App() {
  return (
    <SettingsProvider>
      <WorkspaceProvider>
        <TabsProvider>
          <FileActionsProvider>
            <AppShell />
          </FileActionsProvider>
        </TabsProvider>
      </WorkspaceProvider>
    </SettingsProvider>
  );
}
