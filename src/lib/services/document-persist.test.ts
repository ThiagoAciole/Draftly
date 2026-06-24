import { describe, expect, it, vi } from 'vitest';
import { persistDocument } from './document-persist.js';

describe('persistDocument', () => {
	it('marks the path before and after a successful write', async () => {
		const markSelfWrite = vi.fn();

		const result = await persistDocument({
			path: 'note.md',
			content: 'saved',
			getCurrentContent: () => 'saved',
			write: vi.fn().mockResolvedValue(undefined),
			markSelfWrite,
			clearSelfWrite: vi.fn(),
		});

		expect(result).toEqual({
			ok: true,
			savedContent: 'saved',
			isDirty: false,
		});
		expect(markSelfWrite).toHaveBeenCalledTimes(2);
	});

	it('clears the watcher marker after a failed write', async () => {
		const error = new Error('disk full');
		const clearSelfWrite = vi.fn();

		const result = await persistDocument({
			path: 'note.md',
			content: 'draft',
			getCurrentContent: () => 'draft',
			write: vi.fn().mockRejectedValue(error),
			markSelfWrite: vi.fn(),
			clearSelfWrite,
		});

		expect(result).toEqual({ ok: false, error });
		expect(clearSelfWrite).toHaveBeenCalledWith('note.md');
	});
});
