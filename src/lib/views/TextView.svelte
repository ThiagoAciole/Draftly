<script lang="ts">
  import { tabManager } from "../stores/tabs.svelte.js";
  import { settings } from "../stores/settings.svelte.js";
  import { t } from "../utils/i18n.js";
  import SvgIcon from "../icons/SvgIcon.svelte";
  import Editor from "../components/Editor.svelte";

  let {
    tab,
    editorLanguage,
    isPlainText,
    theme,
    zoomLevel = $bindable(),
    editorPane = $bindable(),
    editorPaneEl = $bindable(),
    findOpen,
    saveContent,
    addToast,
    handleNewFile,
    selectFile,
    closeFile,
    openFileLocation,
    handleUndoCloseTab,
    handleEditorScrollSync,
    triggerFindAction,
  } = $props();
</script>

<div
  class="layout-container editing"
  class:has-sidebar={settings.showSidebar}
  class:toc-on-left={settings.tocSide === "left"}
  class:toc-on-right={settings.tocSide === "right"}
>
  {#if settings.showSidebar}
    <div class="toc-rail" class:on-right={settings.tocSide === "right"}>
      <!-- Botão de Busca na sidebar em arquivos de Texto Puro -->
      <button
        class="toc-rail-button"
        class:active={findOpen}
        data-find-toggle="true"
        onclick={triggerFindAction}
      >
        <SvgIcon name="markdown-viewer-7" />
        <span class="visually-hidden">{t("tooltip.find", settings.language)}</span>
      </button>
    </div>
  {/if}

  <div bind:this={editorPaneEl} class="pane editor-pane active" style="flex: 1">
    <div class="editor-shell">
      <div class="editor-surface">
        <Editor
          bind:this={editorPane}
          bind:value={tab.rawContent}
          language={editorLanguage}
          plainTextMode={isPlainText}
          {theme}
          onsave={saveContent}
          ontoast={addToast}
          bind:zoomLevel
          onnew={handleNewFile}
          onopen={selectFile}
          onclose={closeFile}
          onreveal={openFileLocation}
          onhome={() => {}} 
          onnextTab={() => tabManager.cycleTab("next")}
          onprevTab={() => tabManager.cycleTab("prev")}
          onundoClose={handleUndoCloseTab}
          onscrollsync={handleEditorScrollSync}
        />
      </div>
    </div>
  </div>
</div>
