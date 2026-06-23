<script lang="ts">
	import { tick } from 'svelte';
	import { fade, scale } from 'svelte/transition';

	export interface CommandPaletteItem {
		id: string;
		label: string;
		detail?: string;
		keywords?: string;
		run: () => unknown | Promise<unknown>;
	}

	let { show, items, onclose } = $props<{
		show: boolean;
		items: CommandPaletteItem[];
		onclose: () => void;
	}>();

	let query = $state('');
	let selectedIndex = $state(0);
	let inputElement = $state<HTMLInputElement>();

	let filteredItems = $derived.by(() => {
		const normalized = query.trim().toLowerCase();
		if (!normalized) return items;
		return items.filter((item: CommandPaletteItem) =>
			`${item.label} ${item.detail ?? ''} ${item.keywords ?? ''}`
				.toLowerCase()
				.includes(normalized),
		);
	});

	$effect(() => {
		if (!show) return;
		query = '';
		selectedIndex = 0;
		tick().then(() => inputElement?.focus());
	});

	async function execute(item: CommandPaletteItem | undefined) {
		if (!item) return;
		onclose();
		await item.run();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			onclose();
		} else if (event.key === 'ArrowDown') {
			event.preventDefault();
			selectedIndex = Math.min(selectedIndex + 1, filteredItems.length - 1);
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			selectedIndex = Math.max(selectedIndex - 1, 0);
		} else if (event.key === 'Enter') {
			event.preventDefault();
			execute(filteredItems[selectedIndex]);
		}
	}
</script>

{#if show}
	<div class="palette-backdrop" transition:fade={{ duration: 100 }} onclick={onclose} role="presentation">
		<div
			class="palette"
			transition:scale={{ duration: 120, start: 0.98 }}
			onclick={(event) => event.stopPropagation()}
			onkeydown={handleKeydown}
			role="dialog"
			tabindex="-1"
			aria-modal="true"
			aria-label="Command Palette">
			<input
				bind:this={inputElement}
				bind:value={query}
				oninput={() => (selectedIndex = 0)}
				placeholder="Type a command or file name"
				aria-label="Search commands" />
			<div class="results" role="listbox">
				{#each filteredItems as item, index (item.id)}
					<button
						class:active={index === selectedIndex}
						onmouseenter={() => (selectedIndex = index)}
						onclick={() => execute(item)}
						role="option"
						aria-selected={index === selectedIndex}>
						<span>{item.label}</span>
						{#if item.detail}<small>{item.detail}</small>{/if}
					</button>
				{:else}
					<p>No matching commands</p>
				{/each}
			</div>
		</div>
	</div>
{/if}

<style>
	.palette-backdrop {
		position: fixed;
		inset: 0;
		z-index: 31000;
		display: flex;
		justify-content: center;
		align-items: flex-start;
		padding-top: min(18vh, 160px);
		background: rgba(0, 0, 0, 0.35);
	}

	.palette {
		width: min(620px, calc(100vw - 32px));
		overflow: hidden;
		border: 1px solid var(--color-border-default);
		border-radius: 12px;
		background: var(--color-canvas-overlay);
		box-shadow: 0 24px 70px rgba(0, 0, 0, 0.35);
		font-family: var(--win-font);
	}

	input {
		box-sizing: border-box;
		width: 100%;
		padding: 16px 18px;
		border: 0;
		border-bottom: 1px solid var(--color-border-muted);
		outline: 0;
		background: transparent;
		color: var(--color-fg-default);
		font: inherit;
		font-size: 16px;
	}

	.results {
		max-height: 360px;
		overflow: auto;
		padding: 6px;
	}

	button {
		display: flex;
		width: 100%;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 10px 12px;
		border: 0;
		border-radius: 7px;
		background: transparent;
		color: var(--color-fg-default);
		text-align: left;
		cursor: pointer;
	}

	button.active {
		background: var(--color-neutral-muted);
	}

	small,
	p {
		color: var(--color-fg-muted);
	}

	p {
		margin: 20px;
		text-align: center;
	}
</style>
