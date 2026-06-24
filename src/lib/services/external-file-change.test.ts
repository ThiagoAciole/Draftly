import { describe, expect, it, vi } from 'vitest';
import { inspectExternalFileChange } from './external-file-change.js';

describe('inspectExternalFileChange', () => {
	it('returns unchanged when disk content matches the saved version', async () => {
		const result = await inspectExternalFileChange({
			path: 'note.md',
			originalContent: 'same',
			isDirty: false,
			read: vi.fn().mockResolvedValue('same'),
		});

		expect(result).toEqual({ kind: 'unchanged' });
	});

	it('returns reload when a clean document changed on disk', async () => {
		const result = await inspectExternalFileChange({
			path: 'note.md',
			originalContent: 'old',
			isDirty: false,
			read: vi.fn().mockResolvedValue('external'),
		});

		expect(result).toEqual({ kind: 'reload', content: 'external' });
	});

	it('returns conflict when local and external versions changed', async () => {
		const result = await inspectExternalFileChange({
			path: 'note.md',
			originalContent: 'old',
			isDirty: true,
			read: vi.fn().mockResolvedValue('external'),
		});

		expect(result).toEqual({ kind: 'conflict', content: 'external' });
	});

	it.each([
		'The system cannot find the file specified.',
		'No such file or directory (os error 2)',
		'ENOENT: no such file or directory',
	])('preserves the open copy when the file was removed or renamed: %s', async (message) => {
		const result = await inspectExternalFileChange({
			path: 'note.md',
			originalContent: 'safe copy',
			isDirty: false,
			read: vi.fn().mockRejectedValue(new Error(message)),
		});

		expect(result).toEqual({ kind: 'missing' });
	});

	it('reports temporary access failures without treating the file as deleted', async () => {
		const error = new Error('Access is denied. (os error 5)');
		const result = await inspectExternalFileChange({
			path: 'note.md',
			originalContent: 'safe copy',
			isDirty: false,
			read: vi.fn().mockRejectedValue(error),
		});

		expect(result).toEqual({ kind: 'unavailable', error });
	});
});
