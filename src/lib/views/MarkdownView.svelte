<script lang="ts">
  import { tabManager } from "../stores/tabs.svelte.js";
  import { settings } from "../stores/settings.svelte.js";
  import { t } from "../utils/i18n.js";
  import SvgIcon from "../icons/SvgIcon.svelte";
  import Editor from "../components/Editor.svelte";
  import MarkdownVisualEditor from "../components/MarkdownVisualEditor.svelte";
  import Toc from "../components/Toc.svelte";
  import { highlightColorMap } from "../features/preview/markdown.processor.js";
  import { fly } from "svelte/transition";
  import { cubicOut } from "svelte/easing";
  import { tauriCommands } from "../api/tauri.js";

  let {
    tab,
    workspaceMode = "view",
    isMarkdown,
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
    collapsedHeaders,
    tooltip = $bindable(),
    docContextMenu = $bindable(),
    findOpen,
    saveContent,
    addToast,
    handleNewFile,
    selectFile,
    closeFile,
    openFileLocation,
    toggleEdit,
    toggleLiveMode,
    handleUndoCloseTab,
    handleScroll,
    handleLinkClick,
    triggerFindAction,
    pushScrollHistory,
    toggleFold,
    uiLanguage
  } = $props();

  let isAdjustMode = $derived(workspaceMode === "adjust");
</script>

<div
  class="layout-container"
  class:editing={isAdjustMode}
  class:has-open-toc={isMarkdown && settings.showToc}
  class:has-sidebar={settings.showSidebar}
  class:toc-on-left={settings.tocSide === "left"}
  class:toc-on-right={settings.tocSide === "right"}
>
  {#if settings.showSidebar}
    <div class="toc-rail" class:on-right={settings.tocSide === "right"}>
      <!-- Home button handled at parent level -->
      <button
        class="toc-rail-button"
        class:active={findOpen}
        data-find-toggle="true"
        onclick={triggerFindAction}
      >
        <SvgIcon name="markdown-viewer-7" />
        <span class="visually-hidden">{t("tooltip.find", settings.language)}</span>
      </button>
      {#if isMarkdown}
        <button
          class="toc-rail-button"
          class:active={settings.showToc}
          onclick={() => settings.toggleToc()}
        >
          <SvgIcon name="markdown-viewer-8" />
          <span class="visually-hidden">{t("tooltip.showTableOfContents", settings.language)}</span>
        </button>
        <button
          class="toc-rail-button"
          class:active={settings.showMarkdownToolbar}
          onclick={() => settings.toggleMarkdownToolbar()}
        >
          <SvgIcon name="markdown-viewer-9" />
          <span class="visually-hidden">{t("settings.markdownToolbar", settings.language)}</span>
        </button>
      {/if}
    </div>
  {/if}

  <!-- Editor Pane -->
  <div
    bind:this={editorPaneEl}
    class="pane editor-pane"
    class:active={isAdjustMode}
    class:markdown-toolbar-pane={isMarkdown && settings.showMarkdownToolbar}
    style="flex: {isAdjustMode ? 1 : 0}"
  >
    {#if isAdjustMode}
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
            onhome={() => {}} 
            onnextTab={() => tabManager.cycleTab("next")}
            onprevTab={() => tabManager.cycleTab("prev")}
            onundoClose={handleUndoCloseTab}
          />
        </div>
      </div>
    {/if}
  </div>

  <!-- Viewer Pane -->
  <div
    bind:this={viewerPaneEl}
    class="pane viewer-pane"
    class:active={!isAdjustMode}
    style="flex: {!isAdjustMode ? 1 : 0}"
  >
    <div class="viewer-content">
      {#if !isAdjustMode}
        <MarkdownVisualEditor
          bind:value={tab.rawContent}
          html={sanitizedHtml}
          bind:searchTarget={markdownBody}
          onchange={(nextValue) =>
            tabManager.updateTabRawContent(tab.id, nextValue)}
          onscroll={handleScroll}
          onclick={handleLinkClick}
          onkeydown={(e) => {
            if (e.key === "Enter" || e.key === " ") handleLinkClick(e as unknown as MouseEvent);
          }}
        />
      {/if}
      {#if loadingTabs.includes(tab.id) && isAtBottom}
        <div class="loading-chip" transition:fly={{ y: 20, duration: 300, easing: cubicOut }}>
          <div class="loading-spinner"></div>
          <span>{t("common.loadingFullDocument", settings.language)}</span>
        </div>
      {/if}
    </div>
  </div>

  <!-- Unified TOC Support -->
  {#if isMarkdown}
    <div
      class="top-fade-mask"
      style={settings.tocSide === "left" ? "left: 0;" : "right: 0; left: auto;"}
    ></div>
    {#if settings.showToc}
      <div
        transition:fly={{ x: settings.tocSide === "left" ? -240 : 240, duration: 300, opacity: 1, easing: cubicOut }}
        class="toc-overlay-wrapper"
        class:on-right={settings.tocSide === "right"}
      >
        <Toc
          {markdownBody}
          htmlContent={sanitizedHtml}
          onBeforeJump={pushScrollHistory}
          {collapsedHeaders}
          ontoggleFold={toggleFold}
          oncopyref={(text: string) => {
            const fn = tab.path ? tab.path.split(/[/\\]/).pop()?.replace(/\.[^.]+$/, "") || "" : "";
            tauriCommands.writeClipboardText(fn ? `[[${fn}#${text}]]` : `#${text}`);
          }}
          onjump={(id: string, text: string) => {
            if (isAdjustMode && editorPane) editorPane.revealHeader(text);
          }}
          oncontext={(e, item) => {
            docContextMenu = {
              show: true,
              x: e.clientX,
              y: e.clientY,
              items: [
                {
                  label: t("menu.copyReference", uiLanguage),
                  onClick: () => {
                    const fn = tab.path ? tab.path.split(/[/\\]/).pop()?.replace(/\.[^.]+$/, "") || "" : "";
                    tauriCommands.writeClipboardText(fn ? `[[${fn}#${item.text}]]` : `#${item.text}`);
                    docContextMenu.show = false;
                  },
                },
              ],
            };
          }}
          onshowTooltip={(e, text, shortcut, align) => {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            tooltip = {
              show: true,
              text,
              shortcut: shortcut || "",
              html: "",
              isFootnote: false,
              x: align === "right" ? rect.right + 8 : (align as any) === "left" ? rect.left - 8 : rect.left + rect.width / 2,
              y: align === "right" || (align as any) === "left" ? rect.top + rect.height / 2 : align === "below" ? rect.bottom + 8 : rect.top - 8,
              align: align || "top",
            };
          }}
          onhideTooltip={() => (tooltip.show = false)}
        />
      </div>
    {/if}
  {/if}
</div>
