import { describe, expect, it, vi } from 'vitest';
import { saveDocumentSnapshot } from './document-save.js';
import { closeTabsSafely } from './tab-close.js';

describe('closeTabsSafely', () => {
	it('closes every tab only after all tabs are approved', async () => {
		const close = vi.fn();
		const canClose = vi.fn().mockResolvedValue(true);

		const closed = await closeTabsSafely(['one', 'two'], canClose, close);

		expect(closed).toBe(true);
		expect(canClose).toHaveBeenCalledTimes(2);
		expect(close.mock.calls).toEqual([['one'], ['two']]);
	});

	it('does not close any tab when one approval is cancelled', async () => {
		const close = vi.fn();
		const canClose = vi
			.fn()
			.mockResolvedValueOnce(true)
			.mockResolvedValueOnce(false);

		const closed = await closeTabsSafely(['one', 'two', 'three'], canClose, close);

		expect(closed).toBe(false);
		expect(canClose).toHaveBeenCalledTimes(2);
		expect(close).not.toHaveBeenCalled();
	});

	it('keeps every tab open when saving one document fails', async () => {
		const close = vi.fn();
		const write = vi.fn().mockImplementation(async (path: string) => {
			if (path === 'two.md') throw new Error('disk is locked');
		});

		const closed = await closeTabsSafely(
			['one.md', 'two.md'],
			async (path) => {
				try {
					await saveDocumentSnapshot({
						path,
						content: `content:${path}`,
						getCurrentContent: () => `content:${path}`,
						write,
					});
					return true;
				} catch {
					return false;
				}
			},
			close,
		);

		expect(closed).toBe(false);
		expect(write.mock.calls.map(([path]) => path)).toEqual(['one.md', 'two.md']);
		expect(close).not.toHaveBeenCalled();
	});
});
