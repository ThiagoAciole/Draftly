import { describe, expect, it } from 'vitest';
import {
	getRelativeMarkdownTarget,
	normalizeComparableMarkdownPath,
	resolveMarkdownTarget,
} from './markdown-navigation.js';

describe('Markdown navigation', () => {
	it('parses relative Markdown links with anchors', () => {
		expect(getRelativeMarkdownTarget('../guide.md?raw=1#install')).toEqual({
			path: '../guide.md',
			hash: 'install',
		});
	});

	it.each([
		'https://example.com/guide.md',
		'mailto:person@example.com',
		'//example.com/guide.md',
		'./image.png',
	])('does not treat external or non-Markdown links as document navigation: %s', (href) => {
		expect(getRelativeMarkdownTarget(href)).toBeNull();
	});

	it('resolves relative links from the current document', () => {
		expect(resolveMarkdownTarget('C:/notes/daily/today.md', '../guide.md')).toBe(
			'C:/notes/guide.md',
		);
	});

	it('compares Windows paths without case or separator differences', () => {
		expect(normalizeComparableMarkdownPath('C:\\Notes\\Guide.md', 'windows')).toBe(
			normalizeComparableMarkdownPath('c:/notes/guide.md', 'windows'),
		);
	});
});
