<script lang="ts">
	import SvgIcon from "../../icons/SvgIcon.svelte";
	import { settings } from "../../stores/settings.svelte.js";
	import { t } from "../../utils/i18n.js";
	import { fly } from "svelte/transition";

	const highlightColors = [
		{ value: "default", color: "var(--color-accent-fg)" },
		{ value: "yellow", color: "#ffd000" },
		{ value: "orange", color: "#ff8c00" },
		{ value: "red", color: "#ff3c3c" },
		{ value: "pink", color: "#ff69b4" },
		{ value: "purple", color: "#a46cf4" },
		{ value: "blue", color: "#438af3" },
		{ value: "cyan", color: "#2bb9b2" },
		{ value: "green", color: "#4db158" },
	];

	let { theme = "dark", onSetTheme } = $props<{
		theme?: string;
		onSetTheme?: (t: string) => void;
	}>();

	let highlightMenuOpen = $state(false);

	$effect(() => {
		if (!highlightMenuOpen) return;
		const handleGlobalClick = (e: MouseEvent) => {
			const target = e.target as Element | null;
			if (target?.closest(".custom-dropdown-wrapper")) return;
			highlightMenuOpen = false;
		};
		window.addEventListener("click", handleGlobalClick, true);
		return () => window.removeEventListener("click", handleGlobalClick, true);
	});
</script>

<div class="settings-group">
	<div class="settings-group-header">
		<h2>{t("settings.appearanceSettings", settings.language)}</h2>
	</div>

	<div class="setting-item">
		<label for="appearance-theme">{t("settings.theme", settings.language)}</label>
		<div class="select-wrapper">
			<select
				id="appearance-theme"
				value={theme}
				onchange={(e) => onSetTheme?.(e.currentTarget.value)}
			>
				<option value="light">{t("settings.themeDefaultLight", settings.language)}</option>
				<option value="dark">{t("settings.themeDefaultDark", settings.language)}</option>
			</select>
			<SvgIcon name="settings-7" />
		</div>
	</div>

	<div class="setting-item">
		<label for="appearance-highlight-color"
			>{t("settings.highlightColor", settings.language)}</label
		>
		<div class="custom-dropdown-wrapper">
			<button
				class="custom-dropdown-btn"
				onclick={(e) => {
					e.stopPropagation();
					highlightMenuOpen = !highlightMenuOpen;
				}}
			>
				<div style="display: flex; align-items: center; gap: 8px;">
					<div
						class="color-circle"
						style="background-color: {highlightColors.find(
							(c) => c.value === settings.highlightColor,
						)?.color || 'var(--color-accent-fg)'}"
					></div>
					<span
						>{t(
							`colors.${settings.highlightColor || "default"}`,
							settings.language,
						)}</span
					>
				</div>
				<SvgIcon name="settings-8" />
			</button>
			{#if highlightMenuOpen}
				<div
					class="custom-dropdown-menu"
					transition:fly={{ y: 5, duration: 150 }}
					onpointerdown={(e) => e.stopPropagation()}
				>
					{#each highlightColors as color, index}
						{#if index === 1}
							<div
								class="theme-menu-divider"
								style="height: 1px; background-color: var(--color-border-muted); margin: 4px 0; transform: scaleY(0.5);"
							></div>
						{/if}
						<button
							class="custom-dropdown-option {settings.highlightColor === color.value
								? 'selected'
								: ''}"
							onclick={() => {
								settings.highlightColor = color.value;
								highlightMenuOpen = false;
							}}
						>
							<div class="color-circle" style="background-color: {color.color}"></div>
							<span>{t(`colors.${color.value}`, settings.language)}</span>
						</button>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<div class="setting-item">
		<label for="appearance-tabs">{t("settings.showTabs", settings.language)}</label>
		<label class="toggle">
			<input
				id="appearance-tabs"
				type="checkbox"
				checked={settings.showTabs}
				onchange={() => settings.toggleTabs()}
			/>
			<span class="toggle-slider"></span>
		</label>
	</div>
</div>
