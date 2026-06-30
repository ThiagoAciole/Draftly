<script lang="ts">
  import SvgIcon from "../icons/SvgIcon.svelte";
  import { tauriCommands } from "../api/tauri.js";
  import { settings, type OSType } from "../stores/settings.svelte.js";
  import { fade, scale } from "svelte/transition";
  import { t } from "../utils/i18n.js";
  import GeneralSettings from "./settings/GeneralSettings.svelte";
  import AppearanceSettings from "./settings/AppearanceSettings.svelte";
  import PreviewSettings from "./settings/PreviewSettings.svelte";
  import FilesSettings from "./settings/FilesSettings.svelte";

  let {
    show = false,
    theme = "system",
    onSetTheme,
    onclose,
  } = $props<{
    show?: boolean;
    theme?: string;
    onSetTheme?: (t: string) => void;
    onclose: () => void;
  }>();

  let activeCategory = $state<"general" | "appearance" | "preview" | "files">(
    "general",
  );
  let systemFonts = $state<string[]>([]);
  let loaded = $state(false);
  let settingsModal = $state<HTMLDivElement>();
  let previousActiveElement = $state<HTMLElement | null>(null);
  let osType = $state<OSType>("unknown");

  async function loadFonts() {
    if (loaded) return;
    try {
      const [fonts, os] = await Promise.all([
        tauriCommands.getSystemFonts(),
        tauriCommands.getOsType(),
      ]);
      systemFonts = fonts;
      osType = os as OSType;
      loaded = true;
    } catch (e) {
      console.error("Failed to load system fonts:", e);
      systemFonts = ["Consolas", "Courier New", "Monaco", "Menlo", "Segoe UI"];
      try {
        osType = await tauriCommands.getOsType();
      } catch (e2) {
        console.error("Failed to get OS type:", e2);
        osType = "unknown";
      }
    }
  }

  $effect(() => {
    if (show) {
      loadFonts();
      previousActiveElement = document.activeElement as HTMLElement;
      setTimeout(() => {
        const firstFocusable = settingsModal?.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ) as HTMLElement | null;
        if (firstFocusable) {
          firstFocusable.focus();
        } else {
          settingsModal?.focus();
        }
      }, 50);
    } else if (previousActiveElement) {
      previousActiveElement.focus();
    }
  });

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onclose();
    }
  }

  function handleModalKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      onclose();
      return;
    }

    if (e.key !== "Tab") return;
    const focusableElements =
      settingsModal?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ) || [];
    if (focusableElements.length === 0) return;

    const first = focusableElements[0] as HTMLElement;
    const last = focusableElements[focusableElements.length - 1] as HTMLElement;

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else if (document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
</script>

{#if show}
  <div
    class="settings-backdrop"
    transition:fade={{ duration: 150 }}
    onclick={handleBackdropClick}
    role="presentation"
  >
    <div
      class="settings-modal"
      bind:this={settingsModal}
      transition:scale={{ duration: 200, start: 0.95 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      tabindex="-1"
      onkeydown={handleModalKeydown}
    >
      <div class="settings-header">
        <h1 id="settings-title">{t("settings.title", settings.language)}</h1>
        <button class="close-btn" onclick={onclose} aria-label="Close">
          <SvgIcon name="settings-1" />
        </button>
      </div>

      <div class="settings-content">
        <nav class="settings-nav">
          <button
            class="nav-item"
            class:active={activeCategory === "general"}
            onclick={() => (activeCategory = "general")}
          >
            <SvgIcon name="settings-2" />
            {t("settings.general", settings.language)}
          </button>
          <button
            class="nav-item"
            class:active={activeCategory === "appearance"}
            onclick={() => (activeCategory = "appearance")}
          >
            <SvgIcon name="settings-3" />
            {t("settings.appearance", settings.language)}
          </button>
          <button
            class="nav-item"
            class:active={activeCategory === "preview"}
            onclick={() => (activeCategory = "preview")}
          >
            <SvgIcon name="settings-4" />
            {t("settings.preview", settings.language)}
          </button>
          <button
            class="nav-item"
            class:active={activeCategory === "files"}
            onclick={() => (activeCategory = "files")}
          >
            <SvgIcon name="settings-5" />
            {t("settings.files", settings.language)}
          </button>

          <div class="nav-footer">
            <button
              class="reset-settings-btn"
              type="button"
              onclick={() => settings.resetAllSettings()}
            >
              Redefinir
            </button>
          </div>
        </nav>

        <div class="settings-panel">
          {#if activeCategory === "general"}
            <GeneralSettings />
          {:else if activeCategory === "appearance"}
            <AppearanceSettings {theme} {onSetTheme} />
          {:else if activeCategory === "preview"}
            <PreviewSettings {systemFonts} {osType} />
          {:else if activeCategory === "files"}
            <FilesSettings />
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}


<style>
  .settings-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  }

  .settings-modal {
    background: var(--color-canvas-default);
    border: 1px solid var(--color-border-default);
    border-radius: 6px;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
    width: 560px;
    max-width: 90vw;
    height: 420px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    font-family: var(--win-font);
  }

  .settings-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--color-border-default);
  }

  .settings-header h1 {
    font-size: 16px;
    font-weight: 600;
    margin: 0;
  }

  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    background: transparent;
    cursor: pointer;
    border-radius: 4px;
    color: var(--color-fg-default);
  }

  .close-btn:hover {
    background: var(--color-neutral-muted);
  }

  .settings-content {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .settings-nav {
    width: 140px;
    padding: 12px 8px;
    border-right: 1px solid var(--color-border-default);
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    line-height: 1;
    border: none;
    background: transparent;
    cursor: pointer;
    border-radius: 6px;
    font-size: 13px;
    color: var(--color-fg-default);
    text-align: left;
  }

  .nav-item :global(svg) {
    width: 16px;
    height: 16px;
  }

  .nav-item:hover {
    background: var(--color-neutral-muted);
  }

  .nav-item.active {
    background: var(--color-accent-fg);
    color: var(--color-btn-fg);
  }

  .nav-footer {
    margin-top: auto;
    display: flex;
    flex-direction: column;
  }

  .settings-panel {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
    min-height: 0;
  }


  .reset-settings-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px 16px;
    background-color: var(--color-neutral-muted);
    border: 1px solid var(--color-border-default);
    border-radius: 6px;
    color: var(--color-fg-default);
    font-size: 13px;
    font-family: inherit;
    cursor: pointer;
    outline: none;
    transition: all 0.15s ease;
  }

  .reset-settings-btn:hover:not(.disabled) {
    background-color: var(--color-border-default);
  }

  /* Shared styles used by settings sub-components — must be :global because
     Svelte cannot see the child component DOM from this parent scope. */
  :global(.setting-item) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px solid var(--color-border-muted);
  }

  :global(.setting-item label:first-child) {
    font-size: 13px;
    color: var(--color-fg-default);
    display: flex;
    align-items: center;
    height: 100%;
  }

  :global(.select-wrapper) {
    position: relative;
    display: inline-flex;
    align-items: center;
  }

  :global(.select-arrow) {
    position: absolute;
    right: 10px;
    pointer-events: none;
    color: var(--color-fg-muted);
  }

  :global(.setting-item select) {
    padding: 6px 32px 6px 12px;
    border: 1px solid var(--color-border-default);
    border-radius: 6px;
    background-color: var(--color-canvas-default);
    color: var(--color-fg-default);
    font-size: 13px;
    min-width: 160px;
    cursor: pointer;
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
  }

  :global(.setting-item select option) {
    background-color: var(--color-canvas-default);
    color: var(--color-fg-default);
  }

  :global(.setting-item select:focus) {
    outline: none;
    border-color: var(--color-accent-fg);
  }

  :global(.slider-container) {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  :global(.number-input-wrapper) {
    display: flex;
    align-items: stretch;
    background: var(--color-canvas-default);
    border: 1px solid var(--color-border-default);
    border-radius: 4px;
    overflow: hidden;
    transition: border-color 0.1s;
  }

  :global(.number-input-wrapper:focus-within) {
    border-color: var(--color-accent-fg);
  }

  :global(.number-input) {
    width: 40px;
    padding: 4px 8px;
    background: transparent;
    border: none;
    color: var(--color-fg-default);
    font-family: inherit;
    font-size: 13px;
    text-align: right;
    appearance: textfield;
    -moz-appearance: textfield;
    outline: none;
  }

  :global(.number-input::-webkit-outer-spin-button),
  :global(.number-input::-webkit-inner-spin-button) {
    -webkit-appearance: none;
    margin: 0;
  }

  :global(.number-input-wrapper.horizontal) {
    align-items: center;
    height: 28px;
  }

  :global(.number-input-wrapper.horizontal .number-input) {
    text-align: center;
    width: 36px;
    padding: 4px 0;
    height: 100%;
    border-radius: 0;
  }

  :global(.spin-btn) {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    width: 28px;
    background: transparent;
    border: none;
    color: var(--color-fg-subtle);
    cursor: pointer;
    padding: 0;
    transition: all 0.1s;
  }

  :global(.spin-btn:hover) {
    background: var(--color-canvas-subtle);
    color: var(--color-fg-default);
  }

  :global(.spin-btn:active) {
    background: var(--color-border-muted);
  }

  :global(.text-input) {
    background: var(--color-canvas-default);
    border: 1px solid var(--color-border-default);
    border-radius: 6px;
    color: var(--color-fg-default);
    padding: 6px 10px;
    font-size: 13px;
    outline: none;
  }

  :global(.text-input:focus) {
    border-color: var(--color-accent-fg);
  }

  :global(.spin-btn.minus) {
    border-right: 1px solid var(--color-border-default);
  }

  :global(.spin-btn.plus) {
    border-left: 1px solid var(--color-border-default);
  }

  :global(.slider-value) {
    font-size: 12px;
    color: var(--color-fg-muted);
  }

  :global(.toggle) {
    position: relative;
    display: inline-block;
    width: 40px;
    height: 20px;
    cursor: pointer;
  }

  :global(.toggle input) {
    opacity: 0;
    width: 0;
    height: 0;
  }

  :global(.toggle-slider) {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: transparent;
    border: 1px solid var(--color-fg-muted);
    transition:
      background-color 0.2s,
      border-color 0.2s;
    border-radius: 20px;
  }

  :global(.toggle-slider:before) {
    position: absolute;
    content: "";
    height: 12px;
    width: 12px;
    left: 3px;
    bottom: 3px;
    background-color: #abb2bf;
    transition:
      transform 0.2s cubic-bezier(0.16, 1, 0.3, 1),
      height 0.2s,
      width 0.2s,
      left 0.2s,
      bottom 0.2s,
      background-color 0.2s;
    border-radius: 50%;
  }

  :global(.toggle input:checked + .toggle-slider) {
    background-color: var(--color-accent-fg);
    border-color: var(--color-accent-fg);
  }

  :global(.toggle input:checked + .toggle-slider:before) {
    transform: translateX(20px);
    background-color: #fff;
  }

  :global(.custom-dropdown-wrapper) {
    position: relative;
    min-width: 140px;
  }

  :global(.custom-dropdown-btn) {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 8px;
    background-color: var(--color-canvas-default);
    border: 1px solid var(--color-border-default);
    border-radius: 4px;
    color: var(--color-fg-default);
    font-size: 13px;
    font-family: inherit;
    cursor: pointer;
    outline: none;
  }

  :global(.custom-dropdown-btn:hover) {
    background-color: var(--color-canvas-subtle);
  }

  :global(.custom-dropdown-menu) {
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
    min-width: 140px;
    z-index: 10005;
    gap: 1px;
  }

  :global(.custom-dropdown-option) {
    display: flex;
    align-items: center;
    gap: 8px;
    background: transparent;
    border: none;
    text-align: left;
    padding: 6px 12px;
    font-size: 13px;
    color: var(--color-fg-default);
    cursor: pointer;
    border-radius: 4px;
    font-family: inherit;
    width: 100%;
  }

  :global(.custom-dropdown-option:hover) {
    background-color: var(--color-canvas-subtle);
  }

  :global(.custom-dropdown-option.selected) {
    background-color: var(--color-canvas-subtle);
    font-weight: 500;
  }

  :global(.color-circle) {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    flex-shrink: 0;
    border: 1px solid rgba(128, 128, 128, 0.4);
  }

  :global(.settings-group h2) {
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 16px 0;
    color: var(--color-fg-default);
  }

  :global(.settings-group-header) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  :global(.settings-group-header h2) {
    font-size: 16px;
    font-weight: 600;
    margin: 0;
    color: var(--color-fg-default);
  }

  :global(.settings-subsection-label) {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-fg-muted);
    margin: 0 0 10px 0;
    padding-bottom: 6px;
    border-bottom: 1px solid var(--color-border-muted);
  }

  :global(.settings-subsection-label.with-spacing) {
    margin-top: 18px;
  }

  :global(.editor-type-tabs) {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 2px;
    margin-bottom: 16px;
    padding: 3px;
    background: var(--color-canvas-subtle);
    border: 1px solid var(--color-border-muted);
    border-radius: 6px;
  }

  :global(.editor-type-tabs button) {
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: var(--color-fg-muted);
    cursor: pointer;
    font-family: inherit;
    font-size: 12px;
    font-weight: 500;
    line-height: 1;
    min-width: 0;
    padding: 7px 6px;
    transition:
      background-color 0.15s ease,
      color 0.15s ease;
  }

  :global(.editor-type-tabs button:hover) {
    color: var(--color-fg-default);
    background: var(--color-neutral-muted);
  }

  :global(.editor-type-tabs button.active) {
    background: var(--color-canvas-default);
    color: var(--color-fg-default);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
  }

</style>
