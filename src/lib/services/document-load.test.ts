import { describe, expect, it, vi } from 'vitest';
import { loadDocument } from './document-load.js';

describe('loadDocument', () => {
	it('loads a complete Markdown preview without requesting the full document again', async () => {
		const openMarkdown = vi.fn();
		const readFile = vi.fn();

		const result = await loadDocument('note.md', {
			openMarkdownPreview: vi.fn().mockResolvedValue({
				html: '<h1>Note</h1>',
				content: '# Note',
				isFull: true,
			}),
			openMarkdown,
			readFile,
		});

		expect(result).toEqual({
			kind: 'markdown',
			initial: { html: '<h1>Note</h1>', content: '# Note' },
		});
		expect(openMarkdown).not.toHaveBeenCalled();
		expect(readFile).not.toHaveBeenCalled();
	});

	it('exposes a full Markdown load when the preview is partial', async () => {
		const result = await loadDocument('large.md', {
			openMarkdownPreview: vi.fn().mockResolvedValue({
				html: '<p>partial</p>',
				content: 'partial',
				isFull: false,
			}),
			openMarkdown: vi.fn().mockResolvedValue('<p>full</p>'),
			readFile: vi.fn().mockResolvedValue('full'),
		});

		expect(result.kind).toBe('markdown');
		if (result.kind !== 'markdown') throw new Error('Expected Markdown');
		await expect(result.full).resolves.toEqual({
			html: '<p>full</p>',
			content: 'full',
		});
	});

	it('loads plain files without invoking Markdown commands', async () => {
		const openMarkdownPreview = vi.fn();

		const result = await loadDocument('notes.txt', {
			openMarkdownPreview,
			openMarkdown: vi.fn(),
			readFile: vi.fn().mockResolvedValue('plain text'),
		});

		expect(result).toEqual({ kind: 'text', content: 'plain text' });
		expect(openMarkdownPreview).not.toHaveBeenCalled();
	});
});
