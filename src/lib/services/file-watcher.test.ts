import { describe, expect, it, vi } from 'vitest';
import { createFileWatcherSync } from './file-watcher.js';

describe('createFileWatcherSync', () => {
	it('watches each desired path only once', async () => {
		const watch = vi.fn().mockResolvedValue(undefined);
		const unwatch = vi.fn().mockResolvedValue(undefined);
		const watcher = createFileWatcherSync({ watch, unwatch });

		await watcher.sync(['a.md', 'b.md', 'a.md']);
		await watcher.sync(['a.md', 'b.md']);

		expect(watch.mock.calls).toEqual([['a.md'], ['b.md']]);
		expect(unwatch).not.toHaveBeenCalled();
	});

	it('unwatches stale paths before watching new ones', async () => {
		const operations: string[] = [];
		const watcher = createFileWatcherSync({
			watch: vi.fn(async (path) => {
				operations.push(`watch:${path}`);
			}),
			unwatch: vi.fn(async (path) => {
				operations.push(`unwatch:${path}`);
			}),
		});

		await watcher.sync(['old.md']);
		operations.length = 0;
		await watcher.sync(['new.md']);

		expect(operations).toEqual(['unwatch:old.md', 'watch:new.md']);
	});

	it('continues syncing after a previous operation failed', async () => {
		const watch = vi
			.fn()
			.mockRejectedValueOnce(new Error('watch failed'))
			.mockResolvedValue(undefined);
		const watcher = createFileWatcherSync({
			watch,
			unwatch: vi.fn().mockResolvedValue(undefined),
		});

		await expect(watcher.sync(['first.md'])).rejects.toThrow('watch failed');
		await expect(watcher.sync(['second.md'])).resolves.toBeUndefined();

		expect(watch).toHaveBeenLastCalledWith('second.md');
	});
});
