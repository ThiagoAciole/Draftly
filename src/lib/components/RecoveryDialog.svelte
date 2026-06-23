<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import type { DocumentSnapshot } from '../services/document-session.js';

	let { show, snapshots, onrestore, ondiscard, onclose } = $props<{
		show: boolean;
		snapshots: DocumentSnapshot[];
		onrestore: (snapshot: DocumentSnapshot) => void;
		ondiscard: (snapshot: DocumentSnapshot) => void;
		onclose: () => void;
	}>();
</script>

{#if show}
	<div class="backdrop" transition:fade={{ duration: 120 }} role="presentation">
		<div class="dialog" transition:scale={{ duration: 160, start: 0.96 }} role="dialog" aria-modal="true">
			<header>
				<div>
					<h2>Recover documents</h2>
					<p>Draftly found edits that may not have been saved to disk.</p>
				</div>
				<button class="close" onclick={onclose} aria-label="Close">×</button>
			</header>
			<div class="documents">
				{#each snapshots as snapshot (snapshot.id)}
					<div class="document">
						<div>
							<strong>{snapshot.title}</strong>
							<span>{snapshot.path || 'Unsaved document'}</span>
							<small>{new Date(snapshot.updatedAt).toLocaleString()}</small>
						</div>
						<div class="actions">
							<button onclick={() => ondiscard(snapshot)}>Discard</button>
							<button class="primary" onclick={() => onrestore(snapshot)}>Recover</button>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
{/if}

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 32000;
		display: grid;
		place-items: center;
		padding: 20px;
		background: rgba(0, 0, 0, 0.45);
	}

	.dialog {
		width: min(680px, 100%);
		max-height: min(620px, 90vh);
		overflow: hidden;
		border: 1px solid var(--color-border-default);
		border-radius: 12px;
		background: var(--color-canvas-overlay);
		color: var(--color-fg-default);
		box-shadow: 0 24px 80px rgba(0, 0, 0, 0.4);
		font-family: var(--win-font);
	}

	header,
	.document,
	.actions {
		display: flex;
		align-items: center;
	}

	header {
		justify-content: space-between;
		padding: 20px;
		border-bottom: 1px solid var(--color-border-muted);
	}

	h2,
	p {
		margin: 0;
	}

	header p,
	.document span,
	.document small {
		display: block;
		margin-top: 4px;
		color: var(--color-fg-muted);
	}

	.documents {
		max-height: 480px;
		overflow: auto;
		padding: 8px;
	}

	.document {
		justify-content: space-between;
		gap: 20px;
		padding: 14px 12px;
		border-radius: 8px;
	}

	.document:hover {
		background: var(--color-canvas-subtle);
	}

	.actions {
		gap: 8px;
	}

	button {
		padding: 7px 12px;
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

	button.close {
		border: 0;
		background: transparent;
		font-size: 22px;
	}
</style>
