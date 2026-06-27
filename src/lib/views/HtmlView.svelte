<script lang="ts">
  import { tabManager } from "../stores/tabs.svelte.js";
  import { settings } from "../stores/settings.svelte.js";
  import { t } from "../utils/i18n.js";
  import SvgIcon from "../icons/SvgIcon.svelte";
  import Editor from "../components/Editor.svelte";
  import { fly } from "svelte/transition";
  import { cubicOut } from "svelte/easing";

  let {
    tab,
    isSplit,
    isEditing,
    editorLanguage,
    isPlainText,
    theme,
    zoomLevel = $bindable(),
    sanitizedHtml,
    markdownBody = $bindable(),
    editorPane = $bindable(),
    editorPaneEl = $bindable(),
    viewerPaneEl = $bindable(),
    loadingTabs,
    isAtBottom,
    findOpen,
    saveContent,
    addToast,
    handleNewFile,
    selectFile,
    closeFile,
    openFileLocation,
    toggleEdit,
    toggleLiveMode,
    toggleSplitView,
    handleUndoCloseTab,
    handleEditorScrollSync,
    handleScroll,
    handleLinkClick,
    triggerFindAction,
    startDrag,
    handleSplitterKeyDown,
  } = $props();
</script>

<div
  class="layout-container"
  class:split={isSplit}
  class:editing={isEditing}
  class:has-sidebar={settings.showSidebar}
  class:toc-on-left={settings.tocSide === "left"}
  class:toc-on-right={settings.tocSide === "right"}
>
  {#if settings.showSidebar}
    <div class="toc-rail" class:on-right={settings.tocSide === "right"}>
      <!-- Busca e Navegação da sidebar em arquivos HTML -->
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
  <!-- Editor Pane -->
  <div
    bind:this={editorPaneEl}
    class="pane editor-pane"
    class:active={isEditing || isSplit}
    style="flex: {isSplit ? tab.splitRatio : isEditing ? 1 : 0}"
  >
    {#if isEditing || isSplit}
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
            ontoggleEdit={() => toggleEdit()}
            ontoggleLive={toggleLiveMode}
            ontoggleSplit={() => toggleSplitView(tab.id)}
            onhome={() => {}} 
            onnextTab={() => tabManager.cycleTab("next")}
            onprevTab={() => tabManager.cycleTab("prev")}
            onundoClose={handleUndoCloseTab}
            onscrollsync={handleEditorScrollSync}
          />
        </div>
      </div>
    {/if}
  </div>

  <!-- Splitter -->
  {#if isSplit}
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div
      class="split-bar"
      onmousedown={(e) => startDrag(e, tab.id)}
      onkeydown={handleSplitterKeyDown}
      role="separator"
      aria-orientation="vertical"
      tabindex="0"
    ></div>
  {/if}

  <!-- Viewer Pane -->
  <div
    bind:this={viewerPaneEl}
    class="pane viewer-pane"
    class:active={!isEditing || isSplit}
    style="flex: {isSplit ? 1 - tab.splitRatio : !isEditing ? 1 : 0}"
  >
    <div class="viewer-content">
      <article
        bind:this={markdownBody}
        contenteditable="false"
        class="markdown-body full-width"
        bind:innerHTML={sanitizedHtml}
        onscroll={handleScroll}
        onclick={handleLinkClick}
        onkeydown={(e) => {
          if (e.key === "Enter" || e.key === " ") handleLinkClick(e as unknown as MouseEvent);
        }}
        tabindex="-1"
        style="outline: none; font-family: {settings.previewFont}, sans-serif; font-size: {settings.previewFontSize}px; flex: 1;"
      ></article>
      {#if loadingTabs.includes(tab.id) && isAtBottom}
        <div class="loading-chip" transition:fly={{ y: 20, duration: 300, easing: cubicOut }}>
          <div class="loading-spinner"></div>
          <span>{t("common.loadingFullDocument", settings.language)}</span>
        </div>
      {/if}
    </div>
  </div>
</div>
