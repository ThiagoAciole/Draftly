<script lang="ts">
	import { settings } from "../../stores/settings.svelte.js";
	import { t, getSupportedLanguages } from "../../utils/i18n.js";
	import type { LanguageCode } from "../../utils/i18n.js";
</script>

<div class="settings-group">
	<div class="settings-group-header">
		<h2>{t("settings.generalSettings", settings.language)}</h2>
	</div>

	<div class="setting-item">
		<label for="general-language">{t("settings.language", settings.language)}</label>
		<div class="select-wrapper">
			<select
				id="general-language"
				value={settings.language}
				onchange={(e) => settings.setLanguage(e.currentTarget.value as LanguageCode)}
			>
				{#each getSupportedLanguages() as lang}
					<option value={lang.code}>{lang.nativeName}</option>
				{/each}
			</select>
		</div>
	</div>

	<div class="setting-item">
		<label for="general-start-editor">{t("settings.startInEditor", settings.language)}</label>
		<label class="toggle">
			<input
				id="general-start-editor"
				type="checkbox"
				checked={settings.startInEditor}
				onchange={() => settings.toggleStartInEditor()}
			/>
			<span class="toggle-slider"></span>
		</label>
	</div>

	<div class="setting-item">
		<label for="general-restore-state"
			>{t("settings.restoreStateOnReopen", settings.language)}</label
		>
		<label class="toggle">
			<input
				id="general-restore-state"
				type="checkbox"
				checked={settings.restoreStateOnReopen}
				onchange={() => settings.toggleRestoreStateOnReopen()}
			/>
			<span class="toggle-slider"></span>
		</label>
	</div>

	<div class="setting-item">
		<label for="general-recent-files">{t("settings.showRecentFiles", settings.language)}</label>
		<label class="toggle">
			<input
				id="general-recent-files"
				type="checkbox"
				checked={settings.showRecentFiles}
				onchange={() => settings.toggleShowRecentFiles()}
			/>
			<span class="toggle-slider"></span>
		</label>
	</div>
</div>
