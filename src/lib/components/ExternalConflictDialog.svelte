<script lang="ts">
	import { fade, scale } from 'svelte/transition';

	let { show, fileName, onreload, onkeep, onsavecopy } = $props<{
		show: boolean;
		fileName: string;
		onreload: () => void;
		onkeep: () => void;
		onsavecopy: () => void;
	}>();
</script>

{#if show}
	<div class="backdrop" transition:fade={{ duration: 120 }} role="presentation">
		<div class="dialog" transition:scale={{ duration: 160, start: 0.96 }} role="alertdialog" aria-modal="true">
			<h2>File changed outside Draftly</h2>
			<p>
				<strong>{fileName}</strong> changed on disk while you have unsaved edits.
				Choose which version to keep.
			</p>
			<div class="actions">
				<button onclick={onreload}>Reload disk version</button>
				<button onclick={onsavecopy}>Save local copy</button>
				<button class="primary" onclick={onkeep}>Keep my edits</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 32500;
		display: grid;
		place-items: center;
		padding: 20px;
		background: rgba(0, 0, 0, 0.48);
	}

	.dialog {
		width: min(520px, 100%);
		padding: 22px;
		border: 1px solid var(--color-border-default);
		border-radius: 12px;
		background: var(--color-canvas-overlay);
		color: var(--color-fg-default);
		box-shadow: 0 24px 80px rgba(0, 0, 0, 0.4);
		font-family: var(--win-font);
	}

	h2 {
		margin: 0 0 10px;
		font-size: 19px;
	}

	p {
		margin: 0;
		color: var(--color-fg-muted);
		line-height: 1.5;
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 22px;
	}

	button {
		padding: 8px 12px;
		border: 1px solid var(--color-border-default);
		border-radius: 6px;
		background: var(--color-canvas-subtle);
		color: var(--color-fg-default);
		cursor: pointer;
	}

	button.primary {
		background: var(--color-accent-fg);
		color: var(--color-btn-fg);
	}
</style>
