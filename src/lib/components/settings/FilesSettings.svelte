<script lang="ts">
	import { settings } from "../../stores/settings.svelte.js";
	import { t } from "../../utils/i18n.js";
</script>

<div class="settings-group">
	<div class="settings-group-header">
		<h2>{t("settings.fileSettings", settings.language)}</h2>
	</div>

	<div class="setting-item">
		<label for="files-auto-save">{t("settings.autoSave", settings.language)}</label>
		<label class="toggle">
			<input
				id="files-auto-save"
				type="checkbox"
				checked={settings.autoSave}
				onchange={() => settings.toggleAutoSave()}
			/>
			<span class="toggle-slider"></span>
		</label>
	</div>

	<div class="setting-item">
		<label for="files-confirm-before-save"
			>{t("settings.confirmBeforeSave", settings.language)}</label
		>
		<label class="toggle">
			<input
				id="files-confirm-before-save"
				type="checkbox"
				checked={settings.confirmBeforeSave}
				onchange={() => settings.toggleConfirmBeforeSave()}
			/>
			<span class="toggle-slider"></span>
		</label>
	</div>

	<div class="setting-item">
		<label for="image-directory">{t("settings.imageDirectory", settings.language)}</label>
		<input
			type="text"
			id="image-directory"
			class="text-input"
			style="width: 120px;"
			bind:value={settings.imageDirectory}
			placeholder="img"
		/>
		<span class="slider-value" style="margin-left: 8px;"
			>{t("settings.default", settings.language)}: img</span
		>
	</div>
</div>
