<script lang="ts">
	import DOMPurify from 'dompurify';
	import { onDestroy, onMount } from 'svelte';
	import { settings } from '../stores/settings.svelte.js';
	import type { MarkdownToolbarAction } from '../utils/markdown-toolbar.js';
	import MarkdownToolbar from './MarkdownToolbar.svelte';

	type ZenSection = {
		key: string;
		label: string;
		contentHtml: string;
	};

	const CONTENT_KEY = 'zenNotes.sections.v1';
	const LEGACY_CONTENT_KEY = 'zenNotes.markdown';
	const LAST_DATE_KEY = 'zenNotes.lastWriteDate';
	const PERSIST_DELAY_MS = 500;

	const EDITOR_ALLOWED_TAGS = [
		'p',
		'br',
		'strong',
		'b',
		'em',
		'i',
		'u',
		's',
		'code',
		'pre',
		'blockquote',
		'ul',
		'ol',
		'li',
		'a',
		'h1',
		'h2',
		'h3',
		'h4',
		'h5',
		'h6',
		'hr',
		'table',
		'thead',
		'tbody',
		'tr',
		'th',
		'td',
	];

	const EDITOR_ALLOWED_ATTR = ['href', 'target', 'rel'];

	let sections = $state<ZenSection[]>([]);
	let activeSectionKey = $state('');
	let collapsedSections = $state<Record<string, boolean>>({});
	let persistTimer: ReturnType<typeof setTimeout> | null = null;
	const editorRefs = new Map<string, HTMLDivElement>();

	const todayKey = $derived(getLocalDateKey());

	function getLocalDateKey(date = new Date()) {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	function getDisplayDate(date = new Date()) {
		return new Intl.DateTimeFormat(settings.language || 'pt-BR', {
			weekday: 'long',
			day: '2-digit',
			month: 'long',
			year: 'numeric',
		}).format(date);
	}

	function sanitizeEditorHtml(rawHtml: string) {
		const clean = DOMPurify.sanitize(rawHtml, {
			ALLOWED_TAGS: EDITOR_ALLOWED_TAGS,
			ALLOWED_ATTR: EDITOR_ALLOWED_ATTR,
		})
			.trim();

		return clean || '<p><br></p>';
	}

	function escapeHtml(text: string) {
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}

	function convertLegacyMarkdownToSections(legacyMarkdown: string) {
		const pattern = /(?:<!-- zen-date:([0-9]{4}-[0-9]{2}-[0-9]{2}) -->\n\n)?---\n\n## ([^\n]+)\n\n?/g;
		const matches = Array.from(legacyMarkdown.matchAll(pattern));
		if (matches.length === 0) {
			const text = legacyMarkdown.trim();
			if (!text) return [];
			return [
				{
					key: getLocalDateKey(),
					label: getDisplayDate(),
					contentHtml: `<p>${escapeHtml(text).replace(/\n/g, '<br>')}</p>`,
				},
			];
		}

		return matches.map((match, index) => {
			const start = (match.index || 0) + match[0].length;
			const nextIndex = matches[index + 1]?.index ?? legacyMarkdown.length;
			const body = legacyMarkdown.slice(start, nextIndex).trim();
			const contentHtml = body
				? `<p>${escapeHtml(body).replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br>')}</p>`
				: '<p><br></p>';

			return {
				key: match[1] || match[2].trim(),
				label: match[2].trim(),
				contentHtml,
			};
		});
	}

	function ensureTodaySection() {
		const key = getLocalDateKey();
		const existing = sections.find((section) => section.key === key);
		if (existing) {
			localStorage.setItem(LAST_DATE_KEY, key);
			return existing;
		}

		const created: ZenSection = {
			key,
			label: getDisplayDate(),
			contentHtml: '<p><br></p>',
		};
		sections = [...sections, created];
		activeSectionKey = key;
		localStorage.setItem(LAST_DATE_KEY, key);
		schedulePersist();
		return created;
	}

	function schedulePersist() {
		if (persistTimer) clearTimeout(persistTimer);
		persistTimer = setTimeout(persist, PERSIST_DELAY_MS);
	}

	function persist() {
		sections = sections.map((section) => ({
			...section,
			contentHtml: sanitizeEditorHtml(section.contentHtml),
		}));
		localStorage.setItem(CONTENT_KEY, JSON.stringify(sections));
	}

	function removeEditorRef(key: string) {
		editorRefs.delete(key);
	}

	function editorRef(node: HTMLDivElement, key: string) {
		editorRefs.set(key, node);
		return {
			update(nextKey: string) {
				if (nextKey === key) return;
				removeEditorRef(key);
				key = nextKey;
				editorRefs.set(key, node);
			},
			destroy() {
				removeEditorRef(key);
			},
		};
	}

	function syncEditorContent(node: HTMLDivElement, html: string) {
		const apply = (value: string) => {
			if (document.activeElement === node) return;
			if (node.innerHTML === value) return;
			node.innerHTML = value;
		};

		apply(html);

		return {
			update(nextHtml: string) {
				apply(nextHtml);
			},
		};
	}

	function focusSection(key: string) {
		activeSectionKey = key;
		editorRefs.get(key)?.focus();
	}

	function isSectionCollapsed(key: string) {
		return !!collapsedSections[key];
	}

	function toggleSectionCollapse(key: string) {
		collapsedSections = {
			...collapsedSections,
			[key]: !collapsedSections[key],
		};
		if (!collapsedSections[key]) {
			focusSection(key);
		}
	}

	function insertHtmlAtCaret(html: string) {
		const selection = window.getSelection();
		if (!selection || selection.rangeCount === 0) return;

		const range = selection.getRangeAt(0);
		range.deleteContents();

		const fragment = range.createContextualFragment(html);
		const lastNode = fragment.lastChild;
		range.insertNode(fragment);

		if (lastNode) {
			range.setStartAfter(lastNode);
			range.setEndAfter(lastNode);
			selection.removeAllRanges();
			selection.addRange(range);
		}
	}

	function wrapSelectionWithTag(tagName: string) {
		const selection = window.getSelection();
		const selectedText = selection?.toString() || '';
		const text = selectedText || 'Texto';
		insertHtmlAtCaret(`<${tagName}>${escapeHtml(text)}</${tagName}>`);
	}

	function applyToolbarAction(action: MarkdownToolbarAction) {
		const section =
			sections.find((item) => item.key === activeSectionKey) ||
			ensureTodaySection();
		if (!section) return;

		focusSection(section.key);

		switch (action) {
			case 'heading':
				document.execCommand('formatBlock', false, 'h3');
				break;
			case 'bold':
				document.execCommand('bold');
				break;
			case 'italic':
				document.execCommand('italic');
				break;
			case 'inline-code':
				wrapSelectionWithTag('code');
				break;
			case 'code-block':
				insertHtmlAtCaret('<pre><code>Bloco de codigo</code></pre><p><br></p>');
				break;
			case 'quote':
				document.execCommand('formatBlock', false, 'blockquote');
				break;
			case 'unordered-list':
				document.execCommand('insertUnorderedList');
				break;
			case 'ordered-list':
				document.execCommand('insertOrderedList');
				break;
			case 'link': {
				const selected = window.getSelection()?.toString().trim() || 'link';
				insertHtmlAtCaret(`<a href="https://" target="_blank" rel="noreferrer">${escapeHtml(selected)}</a>`);
				break;
			}
			case 'table':
				insertHtmlAtCaret('<table><thead><tr><th>Coluna</th><th>Valor</th></tr></thead><tbody><tr><td>Item</td><td>Texto</td></tr></tbody></table><p><br></p>');
				break;
			case 'horizontal-rule':
				document.execCommand('insertHorizontalRule');
				break;
		}

		schedulePersist();
	}

	function deleteDateSection(key: string) {
		sections = sections.filter((item) => item.key !== key);
		if (activeSectionKey === key) {
			activeSectionKey = sections[0]?.key || '';
		}

		if (!sections.some((item) => item.key === todayKey)) {
			localStorage.removeItem(LAST_DATE_KEY);
		}

		if (sections.length === 0) {
			ensureTodaySection();
		}

		schedulePersist();
	}

	function handleEditorInput(sectionKey: string, event: Event) {
		const element = event.currentTarget as HTMLDivElement;
		const nextHtml = sanitizeEditorHtml(element.innerHTML);
		const section = sections.find((item) => item.key === sectionKey);
		if (!section) return;
		section.contentHtml = nextHtml;
		activeSectionKey = sectionKey;
		schedulePersist();
	}

	function handleEditorKeydown(sectionKey: string, event: KeyboardEvent) {
		if (event.key !== 'Enter' || event.shiftKey) return;
		if (sectionKey !== todayKey) return;

		const active = event.currentTarget as HTMLDivElement;
		const isEmpty = !active.textContent?.trim();
		if (!isEmpty) return;

		event.preventDefault();
		document.execCommand('insertParagraph');
	}

	function handleEditorFocus(sectionKey: string) {
		activeSectionKey = sectionKey;
	}

	function handleEditorBlur(sectionKey: string, event: FocusEvent) {
		const element = event.currentTarget as HTMLDivElement;
		if (!element.textContent?.trim()) {
			element.innerHTML = '<p><br></p>';
		}
		const section = sections.find((item) => item.key === sectionKey);
		if (section) {
			section.contentHtml = sanitizeEditorHtml(element.innerHTML);
			schedulePersist();
		}
	}

	onMount(() => {
		const stored = localStorage.getItem(CONTENT_KEY);
		if (stored) {
			try {
				const parsed = JSON.parse(stored) as ZenSection[];
				sections = parsed.map((section) => ({
					...section,
					contentHtml: sanitizeEditorHtml(section.contentHtml || ''),
				}));
			} catch (error) {
				console.error('Falha ao carregar notas Zen em formato novo', error);
			}
		}

		if (sections.length === 0) {
			const legacy = localStorage.getItem(LEGACY_CONTENT_KEY);
			if (legacy) {
				sections = convertLegacyMarkdownToSections(legacy);
				schedulePersist();
			}
		}

		ensureTodaySection();
		activeSectionKey = todayKey;
	});

	onDestroy(() => {
		if (persistTimer) clearTimeout(persistTimer);
		persist();
	});
</script>

<div class="zen-notes">
	<div class="zen-surface">
		{#each sections as section (section.key)}
			<section class="zen-day" class:collapsed={isSectionCollapsed(section.key)}>
				<div class="zen-day-card">
					<div class="zen-day-header-row">
						<button
							type="button"
							class="zen-collapse-toggle"
							aria-expanded={!isSectionCollapsed(section.key)}
							aria-label={isSectionCollapsed(section.key) ? 'Discolapsar data' : 'Collapsar data'}
							title={isSectionCollapsed(section.key) ? 'Discolapsar data' : 'Collapsar data'}
							onclick={() => toggleSectionCollapse(section.key)}>
							<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="transform: {isSectionCollapsed(section.key) ? 'rotate(-90deg)' : 'rotate(0deg)'}; transition: transform 120ms ease;">
								<path d="M9 18l6-6-6-6"></path>
							</svg>
						</button>
						<h2 class="zen-date-heading" style="font-family: {settings.previewFont}, sans-serif;">
							<span>{section.label}</span>
						</h2>
						<button
							type="button"
							class="zen-date-delete"
							data-zen-date={section.key}
							aria-label="Excluir dia"
							title="Excluir dia"
							onclick={() => deleteDateSection(section.key)}>
							<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
								<path d="M3 6h18"></path>
								<path d="M8 6V4h8v2"></path>
								<path d="M19 6l-1 14H6L5 6"></path>
								<path d="M10 11v5"></path>
								<path d="M14 11v5"></path>
							</svg>
						</button>
					</div>
					<div class="zen-divider" aria-hidden="true"></div>
					{#if !isSectionCollapsed(section.key)}
						<div
							use:editorRef={section.key}
							use:syncEditorContent={section.contentHtml}
							class="markdown-body zen-editor"
							class:is-active={section.key === activeSectionKey}
							contenteditable="true"
							role="textbox"
							aria-multiline="true"
							tabindex="0"
							style="font-family: {settings.previewFont}, sans-serif; font-size: {settings.previewFontSize}px;"
							data-placeholder="Escreva aqui..."
							onfocus={() => handleEditorFocus(section.key)}
							onblur={(event) => handleEditorBlur(section.key, event)}
							oninput={(event) => handleEditorInput(section.key, event)}
							onkeydown={(event) => handleEditorKeydown(section.key, event)}></div>
					{/if}
				</div>
			</section>
		{/each}
	</div>

	<MarkdownToolbar onaction={applyToolbarAction} />
</div>

<style>
	.zen-notes {
		position: absolute;
		inset: 36px 0 0;
		display: flex;
		justify-content: center;
		overflow: auto;
		background: var(--color-canvas-default);
	}

	.zen-surface {
		width: min(920px, calc(100% - 48px));
		min-height: 100%;
		padding: 24px 0 120px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.zen-day {
		display: flex;
		flex-direction: column;
		gap: 0;
		padding: 0;
		border: 0;
		border-radius: 0;
		background: transparent;
		box-shadow: none;
	}

	.zen-day-card {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.zen-day-header-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.zen-collapse-toggle {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		padding: 0;
		border: 0;
		border-radius: 999px;
		background: transparent;
		color: var(--color-fg-muted);
		cursor: pointer;
		flex: 0 0 auto;
	}

	.zen-collapse-toggle:hover {
		color: var(--color-fg-default);
		background: var(--color-canvas-subtle);
	}

	.zen-date-heading {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: flex-start;
		gap: 10px;
		margin: 0;
		text-transform: capitalize;
		font-size: 0.98rem;
		font-weight: 700;
	}

	.zen-divider {
		height: 1px;
		width: 100%;
		margin: 2px 0 8px;
		background: var(--color-border-muted);
		opacity: 0.8;
	}

	.zen-day.collapsed .zen-divider {
		margin-bottom: 4px;
	}

	.zen-editor {
		max-width: none;
		min-height: 160px;
		padding: 2px 0 0;
		border: 0;
		border-radius: 0;
		color: var(--color-fg-default);
		line-height: 1.6;
		outline: none;
		background: transparent;
		box-shadow: none;
		margin-top: 2px;
	}

	.zen-editor:hover,
	.zen-editor:focus,
	.zen-editor.is-active {
		border: 0;
		background: transparent;
	}

	.zen-editor:empty::before {
		content: attr(data-placeholder);
		color: var(--color-fg-muted);
		pointer-events: none;
	}

	.zen-date-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin: 0;
	}

	.zen-date-delete {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		padding: 0;
		border: 1px solid var(--color-border-muted);
		border-radius: 6px;
		background: var(--color-canvas-subtle);
		color: var(--color-fg-muted);
		cursor: pointer;
		opacity: 0;
		visibility: hidden;
		pointer-events: none;
		transition:
			opacity 120ms ease,
			visibility 120ms ease,
			color 120ms ease,
			border-color 120ms ease,
			background-color 120ms ease;
	}

	.zen-day:hover .zen-date-delete,
	.zen-date-delete:focus-visible {
		opacity: 1;
		visibility: visible;
		pointer-events: auto;
	}

	.zen-date-delete:hover {
		color: var(--color-danger-fg, #f85149);
		border-color: color-mix(in srgb, var(--color-danger-fg, #f85149) 48%, transparent);
		background: color-mix(in srgb, var(--color-danger-fg, #f85149) 12%, transparent);
	}
</style>
