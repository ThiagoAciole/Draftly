<script lang="ts">
	import SvgIcon from "../../icons/SvgIcon.svelte";
	import { settings, DEFAULT_FONTS, type OSType } from "../../stores/settings.svelte.js";
	import { t } from "../../utils/i18n.js";

	let {
		systemFonts = [],
		osType = "unknown" as OSType,
	} = $props<{
		systemFonts?: string[];
		osType?: OSType;
	}>();

	let activeEditorTab = $state<"general" | "markdown" | "json" | "text">("general");
	let defaultFonts = $derived(DEFAULT_FONTS[osType as OSType] || DEFAULT_FONTS.unknown);
</script>

<div class="settings-group">
	<div class="settings-group-header">
		<h2>{t("settings.previewSettings", settings.language)}</h2>
	</div>

	<div class="editor-type-tabs" role="tablist" aria-label={t("settings.previewSettings", settings.language)}>
		<button
			type="button"
			role="tab"
			aria-selected={activeEditorTab === "general"}
			class:active={activeEditorTab === "general"}
			onclick={() => (activeEditorTab = "general")}
		>
			{t("settings.general", settings.language)}
		</button>
		<button
			type="button"
			role="tab"
			aria-selected={activeEditorTab === "markdown"}
			class:active={activeEditorTab === "markdown"}
			onclick={() => (activeEditorTab = "markdown")}
		>
			Markdown
		</button>
		<button
			type="button"
			role="tab"
			aria-selected={activeEditorTab === "json"}
			class:active={activeEditorTab === "json"}
			onclick={() => (activeEditorTab = "json")}
		>
			JSON
		</button>
		<button
			type="button"
			role="tab"
			aria-selected={activeEditorTab === "text"}
			class:active={activeEditorTab === "text"}
			onclick={() => (activeEditorTab = "text")}
		>
			Texto
		</button>
	</div>

	{#if activeEditorTab === "general"}
		<p class="settings-subsection-label">{t("settings.editor", settings.language)}</p>

		<div class="setting-item">
			<label for="editor-font">{t("settings.font", settings.language)}</label>
			<div class="select-wrapper">
				<select id="editor-font" bind:value={settings.editorFont}>
					{#each systemFonts as font}
						<option value={font}
							>{font === defaultFonts.editorFont
								? font + " (" + t("settings.default", settings.language) + ")"
								: font}</option
						>
					{/each}
				</select>
				<SvgIcon name="settings-9" />
			</div>
		</div>

		<div class="setting-item">
			<label for="editor-font-size">{t("settings.fontSize", settings.language)}</label>
			<div class="slider-container">
				<div class="number-input-wrapper horizontal">
					<button
						class="spin-btn minus"
						onclick={() => (settings.editorFontSize = Math.max(10, settings.editorFontSize - 1))}
						aria-label="Decrease"
					>
						<SvgIcon name="settings-10" />
					</button>
					<input
						type="number"
						id="editor-font-size"
						min="10"
						max="48"
						bind:value={settings.editorFontSize}
						class="number-input"
					/>
					<button
						class="spin-btn plus"
						onclick={() => (settings.editorFontSize = Math.min(48, settings.editorFontSize + 1))}
						aria-label="Increase"
					>
						<SvgIcon name="settings-11" />
					</button>
				</div>
			</div>
		</div>

		<div class="setting-item">
			<label for="editor-line-numbers">{t("settings.lineNumbers", settings.language)}</label>
			<label class="toggle">
				<input
					id="editor-line-numbers"
					type="checkbox"
					checked={settings.lineNumbers === "on"}
					onchange={() => settings.toggleLineNumbers()}
				/>
				<span class="toggle-slider"></span>
			</label>
		</div>

		<div class="setting-item">
			<label for="editor-line-highlight">{t("settings.lineHighlight", settings.language)}</label>
			<label class="toggle">
				<input
					id="editor-line-highlight"
					type="checkbox"
					checked={settings.renderLineHighlight === "line"}
					onchange={() => settings.toggleLineHighlight()}
				/>
				<span class="toggle-slider"></span>
			</label>
		</div>

		<div class="setting-item">
			<label for="editor-status-bar">{t("settings.statusBar", settings.language)}</label>
			<label class="toggle">
				<input
					id="editor-status-bar"
					type="checkbox"
					checked={settings.statusBar}
					onchange={() => settings.toggleStatusBar()}
				/>
				<span class="toggle-slider"></span>
			</label>
		</div>

	{:else if activeEditorTab === "json"}
		<p class="settings-subsection-label">JSON</p>

		<div class="setting-item">
			<label for="editor-minimap">{t("settings.minimap", settings.language)}</label>
			<label class="toggle">
				<input
					id="editor-minimap"
					type="checkbox"
					checked={settings.minimap}
					onchange={() => settings.toggleMinimap()}
				/>
				<span class="toggle-slider"></span>
			</label>
		</div>

		<div class="setting-item">
			<label for="editor-show-whitespace">{t("settings.showWhitespace", settings.language)}</label>
			<label class="toggle">
				<input
					id="editor-show-whitespace"
					type="checkbox"
					checked={settings.showWhitespace}
					onchange={() => settings.toggleShowWhitespace()}
				/>
				<span class="toggle-slider"></span>
			</label>
		</div>

	{:else if activeEditorTab === "text"}
		<p class="settings-subsection-label">{t("settings.textFiles", settings.language)}</p>

		<div class="setting-item">
			<label for="text-max-width">{t("settings.wrapColumn", settings.language)}</label>
			<div class="slider-container">
				<div class="number-input-wrapper horizontal">
					<button
						class="spin-btn minus"
						onclick={() => (settings.textMaxWidth = Math.max(20, settings.textMaxWidth - 5))}
						aria-label="Decrease"
					>
						<SvgIcon name="settings-12" />
					</button>
					<input
						type="number"
						id="text-max-width"
						min="20"
						max="500"
						bind:value={settings.textMaxWidth}
						class="number-input"
					/>
					<button
						class="spin-btn plus"
						onclick={() => (settings.textMaxWidth = Math.min(500, settings.textMaxWidth + 5))}
						aria-label="Increase"
					>
						<SvgIcon name="settings-13" />
					</button>
				</div>
			</div>
		</div>

		<div class="setting-item">
			<label for="text-word-wrap">{t("settings.wordWrap", settings.language)}</label>
			<div class="select-wrapper">
				<select id="text-word-wrap" bind:value={settings.textWordWrap}>
					<option value="off">{t("menu.wordWrapOff", settings.language)}</option>
					<option value="on">{t("menu.wordWrapOn", settings.language)}</option>
					<option value="wordWrapColumn">{t("menu.wordWrapColumn", settings.language)}</option>
				</select>
				<SvgIcon name="settings-14" />
			</div>
		</div>

	{:else if activeEditorTab === "markdown"}
		<p class="settings-subsection-label with-spacing">Preview</p>

		<div class="setting-item">
			<label for="preview-font">{t("settings.previewFont", settings.language)}</label>
			<div class="select-wrapper">
				<select id="preview-font" bind:value={settings.previewFont}>
					{#each systemFonts as font}
						<option value={font}
							>{font === defaultFonts.previewFont
								? font + " (" + t("settings.default", settings.language) + ")"
								: font}</option
						>
					{/each}
				</select>
				<SvgIcon name="settings-15" />
			</div>
		</div>

		<div class="setting-item">
			<label for="preview-font-size">{t("settings.fontSize", settings.language)}</label>
			<div class="slider-container">
				<div class="number-input-wrapper horizontal">
					<button
						class="spin-btn minus"
						onclick={() =>
							(settings.previewFontSize = Math.max(12, settings.previewFontSize - 1))}
						aria-label="Decrease"
					>
						<SvgIcon name="settings-16" />
					</button>
					<input
						type="number"
						id="preview-font-size"
						min="12"
						max="48"
						bind:value={settings.previewFontSize}
						class="number-input"
					/>
					<button
						class="spin-btn plus"
						onclick={() =>
							(settings.previewFontSize = Math.min(48, settings.previewFontSize + 1))}
						aria-label="Increase"
					>
						<SvgIcon name="settings-17" />
					</button>
				</div>
			</div>
		</div>

		<div class="setting-item">
			<label for="editor-max-width">{t("settings.wrapColumn", settings.language)}</label>
			<div class="slider-container">
				<div class="number-input-wrapper horizontal">
					<button
						class="spin-btn minus"
						onclick={() =>
							(settings.editorMaxWidth = Math.max(20, settings.editorMaxWidth - 5))}
						aria-label="Decrease"
					>
						<SvgIcon name="settings-18" />
					</button>
					<input
						type="number"
						id="editor-max-width"
						min="20"
						max="200"
						bind:value={settings.editorMaxWidth}
						class="number-input"
					/>
					<button
						class="spin-btn plus"
						onclick={() =>
							(settings.editorMaxWidth = Math.min(200, settings.editorMaxWidth + 5))}
						aria-label="Increase"
					>
						<SvgIcon name="settings-19" />
					</button>
				</div>
			</div>
		</div>

		<div class="setting-item">
			<label for="editor-word-wrap">{t("settings.wordWrap", settings.language)}</label>
			<div class="select-wrapper">
				<select id="editor-word-wrap" bind:value={settings.wordWrap}>
					<option value="off">{t("menu.wordWrapOff", settings.language)}</option>
					<option value="on">{t("menu.wordWrapOn", settings.language)}</option>
					<option value="wordWrapColumn">{t("menu.wordWrapColumn", settings.language)}</option>
				</select>
				<SvgIcon name="settings-20" />
			</div>
		</div>

		<div class="setting-item">
			<label for="markdown-toolbar">{t("settings.markdownToolbar", settings.language)}</label>
			<label class="toggle">
				<input
					id="markdown-toolbar"
					type="checkbox"
					checked={settings.showMarkdownToolbar}
					onchange={() => settings.toggleMarkdownToolbar()}
				/>
				<span class="toggle-slider"></span>
			</label>
		</div>

		<div class="setting-item">
			<label for="editor-word-count">{t("settings.wordCount", settings.language)}</label>
			<label class="toggle">
				<input
					id="editor-word-count"
					type="checkbox"
					checked={settings.wordCount}
					onchange={() => settings.toggleWordCount()}
				/>
				<span class="toggle-slider"></span>
			</label>
		</div>

		{#if settings.osType === "macos"}
			<div class="setting-item">
				<label for="macos-image-scaling"
					>{t("settings.scaleMacOSScreenshots", settings.language)}</label
				>
				<label class="toggle">
					<input
						id="macos-image-scaling"
						type="checkbox"
						checked={settings.macosImageScaling}
						onchange={() => settings.toggleMacosImageScaling()}
					/>
					<span class="toggle-slider"></span>
				</label>
				<span class="slider-value" style="margin-left: 8px;"
					>{t("settings.reduceSizeBy50", settings.language)}</span
				>
			</div>
		{/if}

		<div class="setting-item">
			<label for="preview-toc"
				>{t("settings.showTableOfContents", settings.language)}</label
			>
			<label class="toggle">
				<input
					id="preview-toc"
					type="checkbox"
					checked={settings.showToc}
					onchange={() => settings.toggleToc()}
				/>
				<span class="toggle-slider"></span>
			</label>
		</div>
	{/if}
</div>
