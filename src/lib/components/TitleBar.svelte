<script lang="ts">
  import SvgIcon from "../icons/SvgIcon.svelte";
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import { tauriCommands } from "../api/tauri.js";
  import { fly, slide } from "svelte/transition";
  import { flip } from "svelte/animate";
  import TabList from "./TabList.svelte";
  import { tabManager } from "../stores/tabs.svelte.js";
  import { settings } from "../stores/settings.svelte.js";
  import { t } from "../utils/i18n.js";

  let currentLanguage = $state(settings.language);

  $effect(() => {
    currentLanguage = settings.language;
  });

  let {
    isFocused,
    isScrolled,
    currentFile,
    liveMode,

    windowTitle,
    showHome,
    showZenMode = false,
    onselectFile,
    onopenFile,
    onsaveFile,
    onsaveFileAs,
    onexportHtml,
    onexportPdf,
    onexit,
    ontoggleHome,
    ontoggleZenMode,
    onopenFileLocation,
    ontoggleLiveMode,

    isEditing,
    ondetach,
    ontabclick,
    zoomLevel,
    onresetZoom,
    oncloseTab,
    isScrollSynced,
    ontoggleSync,
    theme = "system",
    onSetTheme,
    onopenSettings,
  } = $props<{
    isFocused: boolean;
    isScrolled: boolean;
    currentFile: string;
    liveMode: boolean;

    windowTitle: string;
    showHome: boolean;
    showZenMode?: boolean;
    onselectFile?: () => void;
    onopenFile?: () => void;
    onsaveFile?: () => void;
    onsaveFileAs?: () => void;
    onexportHtml?: () => void;
    onexportPdf?: () => void;
    onexit?: () => void;
    ontoggleHome: () => void;
    ontoggleZenMode?: () => void;
    onopenFileLocation: () => void;
    ontoggleLiveMode: () => void;

    isEditing: boolean;
    ondetach: (tabId: string) => void;
    ontabclick?: () => void;
    zoomLevel?: number;
    onresetZoom?: () => void;

    oncloseTab?: (id: string) => void;
    isScrollSynced?: boolean;
    ontoggleSync?: () => void;

    theme?: string;
    onSetTheme?: (theme: string) => void;
    onopenSettings?: () => void;
  }>();

  const appWindow = getCurrentWindow();

  let innerWidth = $state(1000);
  let isCollapsed = $derived(innerWidth <= 450);

  const DEBUG_MACOS = false;

  const isMac =
    typeof navigator !== "undefined" &&
    (navigator.userAgent.includes("Macintosh") || DEBUG_MACOS);
  const useNativeMacChrome = isMac && !DEBUG_MACOS;
  const modifier = isMac ? "Cmd" : "Ctrl";

  let isWin11 = $state(false);

  $effect(() => {
    tauriCommands
      .isWindows11()
      .then((res) => {
        isWin11 = res as boolean;
      })
      .catch(() => {
        isWin11 = false;
      });
  });

  let tooltip = $state({
    visible: false,
    text: "",
    shortcut: "",
    x: 0,
    y: 0,
    align: "center" as "left" | "center" | "right",
  });

  function showTooltip(
    e: MouseEvent,
    text: string,
    shortcutKey: string = "",
    force: boolean = false,
  ) {
    if (!force && (kebabMenuOpen || homeMenuOpen)) return;
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const edgeThreshold = 100;

    tooltip.text = text;
    tooltip.shortcut = shortcutKey ? `${modifier}+${shortcutKey}` : "";

    if (rect.left < edgeThreshold) {
      tooltip.align = "left";
      tooltip.x = rect.left;
    } else if (rect.right > windowWidth - edgeThreshold) {
      tooltip.align = "right";
      tooltip.x = rect.right;
    } else {
      tooltip.align = "center";
      tooltip.x = rect.left + rect.width / 2;
    }

    tooltip.y = rect.bottom + 8;
    tooltip.visible = true;
  }

  function hideTooltip() {
    tooltip.visible = false;
  }

  let zoomTimeout: ReturnType<typeof setTimeout>;
  let isInitialZoomLoad = true;

  $effect(() => {
    if (zoomLevel !== undefined) {
      if (isInitialZoomLoad) {
        isInitialZoomLoad = false;
        return;
      }

      const kebabBtn = document.querySelector(".kebab-btn") as HTMLElement;
      if (kebabBtn && !kebabMenuOpen && !homeMenuOpen && !themeMenuOpen) {
        const rect = kebabBtn.getBoundingClientRect();
        tooltip.text = `${zoomLevel}%`;
        tooltip.shortcut = "";
        tooltip.align = "right";
        tooltip.x = rect.right;
        tooltip.y = rect.bottom + 8;
        tooltip.visible = true;

        clearTimeout(zoomTimeout);
        zoomTimeout = setTimeout(() => {
          if (tooltip.text === `${zoomLevel}%`) {
            tooltip.visible = false;
          }
        }, 1500);
      }
    }
  });

  const inlineIds = ["sidebar", "zen", "live"];
  let displayWindowTitle = $derived.by(() => {
    if (showZenMode && !currentFile) return "Draftly";
    return windowTitle;
  });
  let sidebarToggleLabel = $derived.by(() =>
    settings.showSidebar ? "Ocultar sidebar" : "Exibir sidebar",
  );

  let visibleActionIds = $derived.by(() => {
    const list: string[] = [];

    if (tabManager.activeTab && !showHome) {
      if (currentFile) list.push("open_loc");

      const ext = currentFile
        ? currentFile.split(".").pop()?.toLowerCase() || ""
        : "md";
      const isMarkdown = ["md", "markdown", "mdown", "mkd", "txt"].includes(
        ext,
      );

      if (isMarkdown) {
        if (!tabManager.activeTab?.isSplit && !isEditing && currentFile) {
          list.push("live");
        }
      }
      list.push("tabs");
    }

    list.push("sidebar");
    list.push("zen");
    if (zoomLevel && zoomLevel !== 100) list.push("zoom");
    list.push("theme");
    list.push("settings");

    return list;
  });

  let themeMenuOpen = $state(false);
  let kebabMenuOpen = $state(false);
  let homeMenuOpen = $state(false);

  function handleSetTheme(t: string) {
    if (onSetTheme) onSetTheme(t);
    themeMenuOpen = false;
  }

  $effect(() => {
    const handleGlobalClick = () => {
      themeMenuOpen = false;
      kebabMenuOpen = false;
      homeMenuOpen = false;
    };
    if (themeMenuOpen || kebabMenuOpen || homeMenuOpen) {
      window.addEventListener("click", handleGlobalClick);
    }
    return () => {
      window.removeEventListener("click", handleGlobalClick);
    };
  });
</script>

<svelte:window bind:innerWidth />

<div
  class="custom-title-bar {isScrolled ? 'scrolled' : ''} {!isMac
    ? 'windows'
    : ''} {useNativeMacChrome ? 'native-mac' : ''}"
>
  {#if !isMac && !isWin11}
    <div class="window-top-border"></div>
  {/if}
  <div class="window-controls-left" data-tauri-drag-region>
    {#if isMac && !useNativeMacChrome}
      <div class="macos-traffic-lights" class:visible={isMac}>
        <button
          class="mac-btn mac-close"
          onclick={() => appWindow.close()}
          aria-label={t("common.close")}
        >
          <SvgIcon name="title-bar-6" />
        </button>
        <button
          class="mac-btn mac-minimize"
          onclick={() => appWindow.minimize()}
          aria-label={t("common.minimize")}
        >
          <SvgIcon name="title-bar-7" />
        </button>
        <button
          class="mac-btn mac-maximize"
          onclick={() => appWindow.toggleMaximize()}
          aria-label={t("common.maximize")}
        >
          <SvgIcon name="title-bar-8" />
        </button>
      </div>
    {/if}
    <div class="home-menu-container" role="presentation">
      <button
        class="icon-home-btn {showHome || homeMenuOpen ? 'active' : ''}"
        onclick={(e) => {
          e.stopPropagation();
          homeMenuOpen = !homeMenuOpen;
          if (homeMenuOpen) {
            themeMenuOpen = false;
            kebabMenuOpen = false;
            hideTooltip();
          }
        }}
        aria-label={t("tooltip.menu", currentLanguage)}
        onmouseenter={(e) => {
          if (!homeMenuOpen) showTooltip(e, t("tooltip.menu", currentLanguage));
        }}
        onmousedown={(e) => e.preventDefault()}
        onmouseleave={hideTooltip}
      >
        <SvgIcon name="title-bar-9" />
      </button>
      {#if homeMenuOpen}
        <div
          class="home-dropdown-menu"
          transition:fly={{ y: 5, duration: 150 }}
          onpointerdown={(e) => e.stopPropagation()}
        >
          <button
            class="home-menu-item"
            onclick={() => {
              homeMenuOpen = false;
              ontoggleHome();
            }}
          >
            <SvgIcon name="title-bar-10" />
            {t("menu.home", currentLanguage)}
          </button>
          <button
            class="home-menu-item"
            onclick={() => {
              homeMenuOpen = false;
              onopenFile?.();
            }}
          >
            <SvgIcon name="title-bar-11" />
            {t("menu.openFile", currentLanguage)}
            <span class="menu-shortcut">{modifier}+O</span>
          </button>
          {#if currentFile !== "" || (tabManager.activeTab && tabManager.activeTab.isEditing)}
            <button
              class="home-menu-item"
              onclick={() => {
                homeMenuOpen = false;
                onsaveFile?.();
              }}
            >
              <SvgIcon name="title-bar-12" />
              {t("menu.save", currentLanguage)}
              <span class="menu-shortcut">{modifier}+S</span>
            </button>
            <button
              class="home-menu-item"
              onclick={() => {
                homeMenuOpen = false;
                onsaveFileAs?.();
              }}
            >
              <SvgIcon name="title-bar-13" />
              {t("menu.saveAs", currentLanguage)}
              <span class="menu-shortcut">{modifier}+Shift+S</span>
            </button>
          {/if}
          {#if currentFile !== "" || (tabManager.activeTab && tabManager.activeTab.content)}
            <div class="home-menu-divider"></div>
            <button
              class="home-menu-item"
              onclick={() => {
                homeMenuOpen = false;
                onexportHtml?.();
              }}
            >
              <SvgIcon name="title-bar-14" />
              {t("menu.exportHtml", currentLanguage)}
            </button>
            <button
              class="home-menu-item"
              onclick={() => {
                homeMenuOpen = false;
                onexportPdf?.();
              }}
            >
              <SvgIcon name="title-bar-15" />
              {t("menu.exportPdf", currentLanguage)}
            </button>
          {/if}
          <div class="home-menu-divider"></div>
          <button
            class="home-menu-item"
            onclick={() => {
              homeMenuOpen = false;
              onexit?.();
            }}
          >
            <SvgIcon name="title-bar-16" />
            {t("menu.exit", currentLanguage)}
            <span class="menu-shortcut">{modifier}+Q</span>
          </button>
        </div>
      {/if}
    </div>
  </div>

  {#if tabManager.tabs.length > 0 && settings.showTabs && !showZenMode}
    <div class="tab-area">
      <TabList
        onnewTab={(type) => tabManager.addNewTab(type)}
        {ondetach}
        {showHome}
        {ontabclick}
        {oncloseTab}
      />
    </div>
  {:else}
    <div class="window-title-container" data-tauri-drag-region>
      <div
        class="window-title {isFocused ? 'focused' : 'unfocused'}"
        data-tauri-drag-region
      >
        <span class="title-text" data-tauri-drag-region>
          {displayWindowTitle}
        </span>
      </div>
    </div>
  {/if}

  <div
    class="title-actions-container {isCollapsed ? 'collapsed' : ''}"
    data-tauri-drag-region
  >
    {#snippet kebabButton()}
      <button
        class="kebab-btn {kebabMenuOpen ? 'active' : ''}"
        onclick={(e) => {
          e.stopPropagation();
          kebabMenuOpen = !kebabMenuOpen;
          if (kebabMenuOpen) {
            themeMenuOpen = false;
            hideTooltip();
          }
        }}
        onmouseenter={(e) => {
          if (!kebabMenuOpen)
            showTooltip(e, t("tooltip.more", currentLanguage));
        }}
        onmousedown={(e) => e.preventDefault()}
        onmouseleave={hideTooltip}
        aria-label={t("tooltip.moreActions", currentLanguage)}
      >
        <SvgIcon name="title-bar-17" />
      </button>
    {/snippet}

    {#snippet actionItems(ids: string[])}
      {#each ids as id (id)}
        {#if id === "sidebar"}
          <button
            class="title-action-btn {settings.showSidebar ? 'active' : ''}"
            onclick={() => settings.toggleSidebar()}
            aria-label={sidebarToggleLabel}
            onmouseenter={(e) => showTooltip(e, sidebarToggleLabel)}
            onmousedown={(e) => e.preventDefault()}
            onmouseleave={hideTooltip}
            transition:fly={{ x: 10, duration: 200 }}
          >
            <SvgIcon name="title-bar-1" />
            <span class="action-label">Sidebar</span>
          </button>
        {:else if id === "zen"}
          <button
            class="title-action-btn {showZenMode ? 'active' : ''}"
            onclick={() => {
              hideTooltip();
              ontoggleZenMode?.();
            }}
            aria-label={t("menu.zenMode", currentLanguage)}
            onmouseenter={(e) =>
              showTooltip(e, t("menu.zenMode", currentLanguage))}
            onmousedown={(e) => e.preventDefault()}
            onmouseleave={hideTooltip}
            transition:fly={{ x: 10, duration: 200 }}
          >
            <SvgIcon name="title-bar-2" />
            <span class="action-label"
              >{t("menu.zenMode", currentLanguage)}</span
            >
          </button>
        {:else if id === "settings"}
          <button
            class="title-action-btn"
            onclick={() => {
              hideTooltip();
              kebabMenuOpen = false;
              onopenSettings?.();
            }}
            aria-label={t("tooltip.settings", currentLanguage)}
            onmouseenter={(e) =>
              showTooltip(e, t("tooltip.settings", currentLanguage))}
            onmousedown={(e) => e.preventDefault()}
            onmouseleave={hideTooltip}
            transition:fly={{ x: 10, duration: 200 }}
          >
            <SvgIcon name="title-bar-3" />
            <span class="action-label"
              >{t("menu.settings", currentLanguage)}</span
            >
          </button>
        {:else if id === "zoom"}
          <button
            class="menu-zoom-item"
            onclick={() => {
              hideTooltip();
              onresetZoom?.();
            }}
            onmousedown={(e) => e.preventDefault()}
            transition:fly={{ y: -10, duration: 150 }}
            aria-label={t("tooltip.resetZoom", currentLanguage)}
          >
            <SvgIcon name="title-bar-4" />
            <span class="zoom-value">{zoomLevel}%</span>
            <span class="menu-shortcut"
              >{t("tooltip.reset", currentLanguage)}</span
            >
          </button>
        {:else if id === "tabs"}
          <button
            class="title-action-btn"
            onclick={() => settings.toggleTabs()}
            aria-label={t("tooltip.tabs", currentLanguage).replace(
              "{{action}}",
              settings.showTabs
                ? t("tooltip.hide", currentLanguage)
                : t("tooltip.show", currentLanguage),
            )}
            onmouseenter={(e) =>
              showTooltip(
                e,
                t("tooltip.tabs", currentLanguage).replace(
                  "{{action}}",
                  settings.showTabs
                    ? t("tooltip.hide", currentLanguage)
                    : t("tooltip.show", currentLanguage),
                ),
                "Shift+B",
              )}
            onmousedown={(e) => e.preventDefault()}
            onmouseleave={hideTooltip}
            transition:fly={{ x: 10, duration: 200 }}
          >
            <SvgIcon name="title-bar-5" />
            <span class="action-label"
              >{t("menu.tabs", currentLanguage).replace(
                "{{action}}",
                settings.showTabs
                  ? t("menu.hide", currentLanguage)
                  : t("menu.show", currentLanguage),
              )}</span
            >
            <span class="menu-shortcut">{modifier}+Shift+B</span>
          </button>
        {:else if id === "open_loc"}
          <button
            class="title-action-btn"
            onclick={onopenFileLocation}
            aria-label={t("tooltip.openFileLocation", currentLanguage)}
            onmouseenter={(e) =>
              showTooltip(e, t("tooltip.openFileLocation", currentLanguage))}
            onmousedown={(e) => e.preventDefault()}
            onmouseleave={hideTooltip}
            transition:fly={{ x: 10, duration: 200 }}
          >
            <SvgIcon name="title-bar-18" />
            <span class="action-label"
              >{t("menu.openLocation", currentLanguage)}</span
            >
          </button>
        {:else if id === "sync"}
          <button
            class="title-action-btn {isScrollSynced ? 'active' : ''}"
            onclick={() => ontoggleSync?.()}
            aria-label={t("tooltip.toggleScrollSync", currentLanguage)}
            onmouseenter={(e) =>
              showTooltip(e, t("tooltip.scrollSync", currentLanguage))}
            onmousedown={(e) => e.preventDefault()}
            onmouseleave={hideTooltip}
            transition:fly={{ x: 10, duration: 200 }}
          >
            <SvgIcon name="title-bar-19" />
            <span class="action-label"
              >{t("menu.syncScroll", currentLanguage)}</span
            >
          </button>
        {:else if id === "live"}
          <button
            class="title-action-btn {liveMode ? 'active' : ''}"
            onclick={ontoggleLiveMode}
            aria-label={t("tooltip.toggleAutoReload", currentLanguage)}
            onmouseenter={(e) =>
              showTooltip(e, t("tooltip.autoReload", currentLanguage))}
            onmousedown={(e) => e.preventDefault()}
            onmouseleave={hideTooltip}
          >
            <SvgIcon name="title-bar-20" />
            <span class="action-label"
              >{t("menu.autoReload", currentLanguage)}</span
            >
          </button>
        {:else if id === "theme"}
          <div class="theme-dropdown-container">
            <button
              class="title-action-btn {themeMenuOpen ? 'active' : ''}"
              onclick={(e) => {
                e.stopPropagation();
                themeMenuOpen = !themeMenuOpen;
                if (themeMenuOpen) hideTooltip();
              }}
              aria-label={t("tooltip.changeTheme", currentLanguage)}
              onmouseenter={(e) => {
                if (!themeMenuOpen)
                  showTooltip(e, t("tooltip.changeTheme", currentLanguage));
              }}
              onmousedown={(e) => e.preventDefault()}
              onmouseleave={hideTooltip}
              transition:fly={{ x: 10, duration: 200 }}
            >
              {#if theme === "light"}
                <SvgIcon name="title-bar-21" />
              {:else if theme === "dark"}
                <SvgIcon name="title-bar-22" />
              {:else}
                <SvgIcon name="title-bar-23" />
              {/if}
              <span class="action-label"
                >{t("menu.changeTheme", currentLanguage)}</span
              >
            </button>
            {#if themeMenuOpen}
              <div
                class="theme-menu"
                transition:fly={{ y: 5, duration: 150 }}
                onpointerdown={(e) => e.stopPropagation()}
              >
                <button
                  class="theme-option {theme === 'light' ? 'selected' : ''}"
                  onclick={() => handleSetTheme("light")}
                >
                  {t("theme.defaultLight", currentLanguage)}
                </button>
                <button
                  class="theme-option {theme === 'dark' ? 'selected' : ''}"
                  onclick={() => handleSetTheme("dark")}
                >
                  {t("theme.defaultDark", currentLanguage)}
                </button>
              </div>
            {/if}
          </div>
        {/if}
      {/each}
    {/snippet}

    {#if isCollapsed}
      {#if visibleActionIds.length > 0}
        {@render kebabButton()}
        {#if kebabMenuOpen}
          <div
            class="title-actions show-dropdown"
            data-tauri-drag-region
            transition:fly={{ y: 5, duration: 150 }}
            onpointerdown={(e) => e.stopPropagation()}
          >
            {@render actionItems(visibleActionIds)}
          </div>
        {/if}
      {/if}
    {:else}
      {@const activeInline = visibleActionIds.filter((id) =>
        inlineIds.includes(id),
      )}
      {@const activeKebab = visibleActionIds.filter(
        (id) => !inlineIds.includes(id),
      )}

      <div class="title-actions inline" data-tauri-drag-region>
        {@render actionItems(activeInline)}
      </div>

      {#if activeKebab.length > 0}
        {@render kebabButton()}
        {#if kebabMenuOpen}
          <div
            class="title-actions show-dropdown"
            data-tauri-drag-region
            transition:fly={{ y: 5, duration: 150 }}
            onpointerdown={(e) => e.stopPropagation()}
          >
            {@render actionItems(activeKebab)}
          </div>
        {/if}
      {/if}
    {/if}
  </div>

  <div class="window-controls-right" data-tauri-drag-region>
    {#if !isMac}
      <button
        class="control-btn"
        onclick={() => appWindow.minimize()}
        aria-label={t("common.minimize")}
      >
        <SvgIcon name="title-bar-24" />
      </button>
      <button
        class="control-btn"
        onclick={() => appWindow.toggleMaximize()}
        aria-label={t("common.maximize")}
      >
        <SvgIcon name="title-bar-25" />
      </button>
      <button
        class="control-btn close-btn"
        onclick={() => appWindow.close()}
        aria-label={t("common.close")}
      >
        <SvgIcon name="title-bar-26" />
      </button>
    {/if}
  </div>
</div>

<div
  class="custom-tooltip {tooltip.visible
    ? 'visible'
    : ''} align-{tooltip.align}"
  style="left: {tooltip.x}px; top: {tooltip.y}px;"
>
  <span class="tooltip-text">{tooltip.text}</span>
  {#if tooltip.shortcut}
    <span class="tooltip-shortcut">{tooltip.shortcut}</span>
  {/if}
</div>

<style>
  .custom-title-bar {
    height: 36px;
    background-color: var(--color-canvas-default);
    display: flex;
    justify-content: space-between;
    align-items: center;
    user-select: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 9999;
    font-family: var(--win-font);
    border-bottom: 1px solid transparent;
    transition: border-color 0.2s;
  }

  .window-top-border {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background-color: var(--color-window-border-top);
    z-index: 10002;
    pointer-events: none;
  }

  .custom-title-bar.scrolled {
    border-bottom-color: var(--color-border-muted);
  }

  .tab-area {
    display: flex;
    flex: 1;
    height: 100%;
    overflow: hidden;
    min-width: 0;
  }

  .window-controls-left {
    display: flex;
    align-items: center;
    padding-left: 10px;
    gap: 12px;
    position: relative;
    z-index: 10000;
  }

  .custom-title-bar.native-mac .window-controls-left {
    padding-left: 78px;
  }

  .title-actions-container {
    display: flex;
    align-items: center;
    position: relative;
    margin-right: 8px;
    margin-left: auto;
    gap: 4px;
    z-index: 10000;
  }

  .kebab-btn {
    display: flex;
    width: 32px;
    height: 32px;
    justify-content: center;
    align-items: center;
    background: transparent;
    border: none;
    color: var(--color-fg-muted);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.1s;
  }

  .kebab-btn:hover,
  .kebab-btn.active {
    background: var(--color-canvas-subtle);
    color: var(--color-fg-default);
  }

  .title-actions {
    display: flex !important;
    flex-direction: row !important;
    align-items: center !important;
    gap: 4px !important;
  }

  .title-actions.show-dropdown {
    display: flex !important;
    flex-direction: column !important;
    align-items: stretch !important;
    gap: 1px !important;
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 4px;
    background-color: var(--color-canvas-default);
    border: 1px solid var(--color-border-default);
    border-radius: 6px;
    padding: 4px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    z-index: 10006;
    width: 200px;
  }

  .theme-dropdown-container {
    display: block;
    width: 100%;
  }

  .title-actions.show-dropdown .title-action-btn {
    width: 100%;
    justify-content: flex-start;
    align-items: center;
    padding: 6px 12px;
    height: auto;
    font-size: 13px;
    color: var(--color-fg-default);
    font-family: var(--win-font);
    gap: 8px;
  }

  .title-actions.show-dropdown .title-action-btn :global(svg) {
    width: 14px;
    min-width: 14px;
    height: 14px;
    flex-shrink: 0;
    display: block;
    margin: 0;
    color: var(--color-fg-muted);
  }

  .title-actions.show-dropdown .title-action-btn.active {
    color: var(--color-accent-fg);
  }

  .title-actions.show-dropdown .title-action-btn.active :global(svg) {
    color: var(--color-accent-fg);
  }

  .title-actions.show-dropdown .action-label {
    display: block;
    margin-left: 0;
    font-size: 13px;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
  }

  .action-label {
    display: none;
  }

  .actions-wrapper {
    display: flex;
    gap: 4px;
  }

  .title-action-btn {
    width: 32px;
    height: 32px;
    display: flex;
    justify-content: center;
    align-items: center;
    background: transparent;
    border: none;
    color: var(--color-fg-muted);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.1s;
  }

  .title-actions.inline .title-action-btn :global(svg),
  .kebab-btn :global(svg) {
    width: 16px;
    height: 16px;
  }

  .title-actions.show-dropdown .menu-zoom-item {
    width: 100%;
    display: flex;
    justify-content: flex-start;
    align-items: center;
    padding: 6px 12px;
    height: auto;
    font-size: 13px;
    color: var(--color-fg-default);
    font-family: var(--win-font);
    gap: 8px;
    background: transparent;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .title-actions.show-dropdown .menu-zoom-item:hover {
    background: var(--color-canvas-subtle);
  }

  .title-actions.show-dropdown .menu-zoom-item :global(svg) {
    width: 14px;
    min-width: 14px;
    height: 14px;
    flex-shrink: 0;
    display: block;
    margin: 0;
    color: var(--color-fg-muted);
  }

  :global(.title-actions.show-dropdown .menu-zoom-item .zoom-value) {
    width: 32px;
    text-align: left;
    color: var(--color-fg-default);
    display: inline-block;
  }

  .title-action-btn.active {
    color: var(--color-accent-fg);
    background: var(--color-canvas-subtle);
  }

  .title-action-btn:hover {
    background: var(--color-canvas-subtle);
    color: var(--color-fg-default);
  }

  .window-icon {
    width: 15px;
    height: 15px;
    opacity: 0.9;
    flex-shrink: 0;
  }

  .icon-home-btn {
    width: 32px;
    height: 32px;
    background: transparent;
    border: none;
    padding: 0;
    margin: 0;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.1s;
  }

  .icon-home-btn:hover,
  .icon-home-btn.active {
    background: var(--color-canvas-subtle);
  }

  .window-title-container {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 5;
  }

  .window-title {
    font-size: 12px;
    transition: opacity 0.2s;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
    max-width: calc(100vw - 450px);
  }

  @media (max-width: 800px) {
    .window-title {
      max-width: calc(100vw - 260px);
    }
  }

  .title-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: block;
  }

  .window-title.focused {
    opacity: 0.8;
    color: var(--color-fg-default);
  }

  .window-title.unfocused {
    opacity: 0.4;
    color: var(--color-fg-default);
  }

  .window-controls-right {
    display: flex;
    height: 100%;
    position: relative;
    z-index: 10000;
  }

  .control-btn {
    width: 46px;
    height: 32px;
    display: flex;
    justify-content: center;
    align-items: center;
    background: transparent;
    border: none;
    color: var(--color-fg-default);
    opacity: 0.8;
    cursor: default;
    transition: all 0.1s;
  }

  .control-btn:hover {
    background: var(--color-canvas-subtle);
    opacity: 1;
  }

  .close-btn:hover {
    background: #e81123 !important;
  }

  .zoom-indicator {
    background: var(--color-canvas-subtle);
    color: var(--color-fg-muted);
    border: 1px solid var(--color-border-default);
    border-radius: 4px;
    padding: 2px 8px;
    font-size: 11px;
    cursor: pointer;
    margin-right: 8px;
    display: flex;
    align-items: center;
    height: 24px;
    align-self: center;
    transition: all 0.1s;
  }

  .zoom-indicator:hover {
    background: var(--color-btn-hover-bg);
    color: var(--color-fg-default);
    border-color: var(--color-border-muted);
  }

  .macos-traffic-lights {
    display: flex;
    gap: 8px;
    margin-right: 12px;
    align-items: center;
    padding-left: 2px;
  }

  .mac-btn {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 1px solid rgba(0, 0, 0, 0.1);
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0;
    cursor: default;
    outline: none;
    position: relative;
    overflow: hidden;
  }

  .mac-close {
    background-color: #ff5f57;
    border-color: #e0443e;
  }

  .mac-minimize {
    background-color: #febc2e;
    border-color: #d3a125;
  }

  .mac-maximize {
    background-color: #28c840;
    border-color: #1ca431;
  }

  :global(.mac-icon) {
    opacity: 0;
    color: #4d0000;
    transition: opacity 0.1s;
  }

  .mac-minimize :global(.mac-icon) {
    color: #995700;
  }

  .mac-maximize :global(.mac-icon) {
    color: #006500;
  }

  .macos-traffic-lights:hover :global(.mac-icon) {
    opacity: 0.6;
  }

  .mac-btn:active {
    filter: brightness(0.9);
  }

  .custom-tooltip {
    position: fixed;
    background: var(--color-canvas-overlay);
    color: var(--color-fg-default);
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 11px;
    font-family: var(--win-font), "Segoe UI", sans-serif;
    pointer-events: none;
    z-index: 10005;
    transform: translateX(-50%) translateY(-4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    border: 1px solid var(--color-border-default);
    display: flex;
    flex-direction: column;
    align-items: center;
    white-space: nowrap;
    gap: 2px;
    opacity: 0;
    transition:
      opacity 0.15s ease,
      transform 0.15s ease,
      width 0.2s cubic-bezier(0.2, 0, 0.2, 1),
      height 0.2s cubic-bezier(0.2, 0, 0.2, 1);
  }

  .custom-tooltip.align-center {
    transform: translateX(-50%) translateY(-4px);
  }
  .custom-tooltip.align-left {
    transform: translateX(0) translateY(-4px);
    align-items: flex-start;
  }
  .custom-tooltip.align-right {
    transform: translateX(-100%) translateY(-4px);
    align-items: flex-end;
  }

  .custom-tooltip.visible {
    opacity: 1;
  }
  .custom-tooltip.visible.align-center {
    transform: translateX(-50%) translateY(0);
  }
  .custom-tooltip.visible.align-left {
    transform: translateX(0) translateY(0);
  }
  .custom-tooltip.visible.align-right {
    transform: translateX(-100%) translateY(0);
  }

  .tooltip-shortcut {
    color: var(--color-fg-muted);
    font-size: 10px;
    font-family: inherit;
  }

  .theme-dropdown-container {
    position: relative;
  }

  .theme-menu {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 4px;
    background-color: var(--color-canvas-default);
    border: 1px solid var(--color-border-default);
    border-radius: 6px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    padding: 4px;
    display: flex;
    flex-direction: column;
    width: 120px;
    z-index: 10005;
    gap: 1px;
  }

  .theme-menu-divider {
    height: 1px;
    background-color: var(--color-border-default);
    margin: 4px 0;
    transform: scaleY(0.5);
  }

  .theme-option {
    background: transparent;
    border: none;
    text-align: left;
    padding: 6px 12px;
    font-size: 12px;
    color: var(--color-fg-default);
    cursor: pointer;
    border-radius: 4px;
    font-family: var(--win-font);
  }

  .theme-option:hover {
    background-color: var(--color-canvas-subtle);
  }

  .theme-option.selected {
    color: var(--color-accent-fg);
    font-weight: 600;
  }

  .menu-shortcut {
    display: none;
    margin-left: auto;
    font-size: 11px;
    color: var(--color-fg-muted);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .home-menu-item .menu-shortcut,
  .title-actions.show-dropdown .menu-shortcut {
    display: block;
  }

  .home-menu-container {
    position: relative;
    display: flex;
    align-items: center;
    height: 100%;
  }

  .home-dropdown-menu {
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 4px;
    background-color: var(--color-canvas-default);
    border: 1px solid var(--color-border-default);
    border-radius: 6px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    padding: 4px;
    display: flex;
    flex-direction: column;
    width: 200px;
    z-index: 10006;
    gap: 1px;
  }

  .home-menu-item {
    display: flex;
    align-items: center;
    background: transparent;
    border: none;
    text-align: left;
    padding: 6px 12px;
    font-size: 13px;
    color: var(--color-fg-default);
    cursor: pointer;
    border-radius: 4px;
    font-family: var(--win-font);
    gap: 8px;
    white-space: nowrap;
  }

  .home-menu-item:hover {
    background-color: var(--color-canvas-subtle);
  }

  .home-menu-item :global(svg) {
    color: var(--color-fg-muted);
  }

  .home-menu-divider {
    height: 1px;
    background-color: var(--color-border-default);
    margin: 4px 0;
  }
</style>
