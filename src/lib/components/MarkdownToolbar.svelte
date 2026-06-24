<script lang="ts">
	import type { MarkdownToolbarAction } from '../utils/markdown-toolbar.js';

	type ToolbarIcon =
		| 'heading'
		| 'bold'
		| 'italic'
		| 'inline-code'
		| 'code-block'
		| 'quote'
		| 'unordered-list'
		| 'ordered-list'
		| 'link'
		| 'table'
		| 'horizontal-rule';

	let { onaction } = $props<{
		onaction: (action: MarkdownToolbarAction) => void;
	}>();

	let toolbar: HTMLDivElement;
	let isDragging = $state(false);
	let dragStartX = 0;
	let dragStartScrollLeft = 0;
	let suppressNextClick = false;

	function handlePointerDown(event: PointerEvent) {
		if (event.button !== 0 || toolbar.scrollWidth <= toolbar.clientWidth) return;

		dragStartX = event.clientX;
		dragStartScrollLeft = toolbar.scrollLeft;
		isDragging = true;
		suppressNextClick = false;
		toolbar.setPointerCapture(event.pointerId);
	}

	function handlePointerMove(event: PointerEvent) {
		if (!isDragging) return;

		const distance = event.clientX - dragStartX;
		if (Math.abs(distance) > 4) {
			suppressNextClick = true;
		}

		toolbar.scrollLeft = dragStartScrollLeft - distance;
	}

	function handlePointerEnd(event: PointerEvent) {
		if (!isDragging) return;

		isDragging = false;
		if (toolbar.hasPointerCapture(event.pointerId)) {
			toolbar.releasePointerCapture(event.pointerId);
		}

		if (suppressNextClick) {
			setTimeout(() => {
				suppressNextClick = false;
			}, 0);
		}
	}

	function handleAction(action: MarkdownToolbarAction) {
		if (suppressNextClick) {
			suppressNextClick = false;
			return;
		}

		onaction(action);
	}

	const items: {
		action: MarkdownToolbarAction;
		icon: ToolbarIcon;
		title: string;
	}[] = [
		{
			action: 'heading',
			icon: 'heading',
			title: 'Alternar título: H3 → H2 → H1 → normal',
		},
		{ action: 'bold', icon: 'bold', title: 'Negrito' },
		{ action: 'italic', icon: 'italic', title: 'Itálico' },
		{ action: 'inline-code', icon: 'inline-code', title: 'Código em linha' },
		{ action: 'code-block', icon: 'code-block', title: 'Bloco de código' },
		{ action: 'quote', icon: 'quote', title: 'Citação' },
		{
			action: 'unordered-list',
			icon: 'unordered-list',
			title: 'Lista não ordenada',
		},
		{
			action: 'ordered-list',
			icon: 'ordered-list',
			title: 'Lista ordenada',
		},
		{ action: 'link', icon: 'link', title: 'Link' },
		{ action: 'table', icon: 'table', title: 'Tabela' },
		{
			action: 'horizontal-rule',
			icon: 'horizontal-rule',
			title: 'Linha horizontal',
		},
	];
</script>

<div
	class="markdown-toolbar"
	class:dragging={isDragging}
	role="toolbar"
	aria-label="Formatação Markdown"
	bind:this={toolbar}
	onpointerdown={handlePointerDown}
	onpointermove={handlePointerMove}
	onpointerup={handlePointerEnd}
	onpointercancel={handlePointerEnd}
>
	{#each items as item}
		<button
			type="button"
			title={item.title}
			aria-label={item.title}
			onmousedown={(event) => event.preventDefault()}
			onclick={() => handleAction(item.action)}
		>
			<svg
				viewBox="0 0 24 24"
				width="18"
				height="18"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				{#if item.icon === 'heading'}
					<path d="M5 5v14M19 5v14M5 12h14"></path>
					<path d="M15.5 5h3.5" opacity="0.55"></path>
				{:else if item.icon === 'bold'}
					<path d="M7 4h7a4 4 0 0 1 0 8H7z"></path>
					<path d="M7 12h8a4 4 0 0 1 0 8H7z"></path>
				{:else if item.icon === 'italic'}
					<path d="M14 4h5M5 20h5M15 4 9 20"></path>
				{:else if item.icon === 'inline-code'}
					<path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"></path>
				{:else if item.icon === 'code-block'}
					<path d="M4 5h5M4 5v14M4 19h5M20 5h-5M20 5v14M20 19h-5"></path>
					<path d="m10 9-3 3 3 3M14 9l3 3-3 3"></path>
				{:else if item.icon === 'quote'}
					<path d="M7 17h4V9H5v5h3c0 2-1 3-3 4"></path>
					<path d="M17 17h4V9h-6v5h3c0 2-1 3-3 4"></path>
				{:else if item.icon === 'unordered-list'}
					<circle cx="4" cy="6" r="1" fill="currentColor" stroke="none"></circle>
					<circle cx="4" cy="12" r="1" fill="currentColor" stroke="none"></circle>
					<circle cx="4" cy="18" r="1" fill="currentColor" stroke="none"></circle>
					<path d="M9 6h11M9 12h11M9 18h11"></path>
				{:else if item.icon === 'ordered-list'}
					<path d="M3 5h1v3M3 8h2M3 12h2l-2 3h2M3 18h2v3H3"></path>
					<path d="M9 6h11M9 13h11M9 20h11"></path>
				{:else if item.icon === 'link'}
					<path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2"></path>
					<path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.2"></path>
				{:else if item.icon === 'table'}
					<rect x="3" y="4" width="18" height="16" rx="1"></rect>
					<path d="M3 10h18M3 15h18M9 4v16M15 4v16"></path>
				{:else if item.icon === 'horizontal-rule'}
					<path d="M4 12h16"></path>
					<path d="m7 9-3 3 3 3M17 9l3 3-3 3" opacity="0.65"></path>
				{/if}
			</svg>
		</button>
	{/each}
</div>

<style>
	.markdown-toolbar {
		position: absolute;
		left: 50%;
		bottom: 40px;
		z-index: 20;
		display: flex;
		align-items: center;
		gap: 2px;
		width: max-content;
		max-width: calc(100% - 24px);
		padding: 5px 7px;
		overflow-x: auto;
		overflow-y: hidden;
		transform: translateX(-50%);
		background: rgba(42, 42, 42, 0.96);
		border: 1px solid rgba(255, 255, 255, 0.07);
		border-radius: 7px;
		box-shadow:
			0 10px 30px rgba(0, 0, 0, 0.28),
			0 2px 8px rgba(0, 0, 0, 0.2);
		backdrop-filter: blur(12px);
		color: #c8c8c8;
		user-select: none;
		cursor: grab;
		scrollbar-width: none;
		-ms-overflow-style: none;
		touch-action: pan-y;
	}

	.markdown-toolbar::-webkit-scrollbar {
		display: none;
		width: 0;
		height: 0;
	}

	.markdown-toolbar.dragging {
		cursor: grabbing;
	}

	.markdown-toolbar.dragging button {
		pointer-events: none;
	}

	button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex: 0 0 auto;
		width: 30px;
		height: 30px;
		padding: 0;
		border: 0;
		border-radius: 4px;
		background: transparent;
		color: inherit;
		cursor: inherit;
		transition:
			background-color 120ms ease,
			color 120ms ease,
			transform 120ms ease;
	}

	button:hover {
		background: rgba(255, 255, 255, 0.09);
		color: #ffffff;
	}

	button:active {
		transform: translateY(1px);
		background: rgba(255, 255, 255, 0.14);
	}

	button:focus-visible {
		outline: 2px solid var(--color-accent-fg);
		outline-offset: -2px;
	}

	svg {
		pointer-events: none;
	}
</style>
