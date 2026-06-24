import { beforeEach, describe, expect, it } from 'vitest';
import { recoveryStore } from './recovery.js';

class LimitedStorage implements Storage {
	private values = new Map<string, string>();
	setCalls = 0;

	constructor(private readonly maxValueLength: number) {}

	get length() {
		return this.values.size;
	}

	clear() {
		this.values.clear();
	}

	getItem(key: string) {
		return this.values.get(key) ?? null;
	}

	key(index: number) {
		return [...this.values.keys()][index] ?? null;
	}

	removeItem(key: string) {
		this.values.delete(key);
	}

	setItem(key: string, value: string) {
		this.setCalls += 1;
		if (value.length > this.maxValueLength) {
			throw new DOMException('Quota exceeded', 'QuotaExceededError');
		}
		this.values.set(key, value);
	}
}

describe('recovery store', () => {
	beforeEach(() => localStorage.clear());

	it('stores the newest snapshot first', () => {
		recoveryStore.save({
			id: 'one',
			path: '',
			title: 'One',
			content: 'first',
			updatedAt: 1,
		});
		recoveryStore.save({
			id: 'two',
			path: 'two.md',
			title: 'Two',
			content: 'second',
			updatedAt: 2,
		});

		expect(recoveryStore.list().map((item) => item.id)).toEqual(['two', 'one']);
	});

	it('replaces snapshots for the same document', () => {
		recoveryStore.save({
			id: 'one',
			path: '',
			title: 'One',
			content: 'old',
			updatedAt: 1,
		});
		recoveryStore.save({
			id: 'one',
			path: '',
			title: 'One',
			content: 'new',
			updatedAt: 2,
		});

		expect(recoveryStore.list()).toHaveLength(1);
		expect(recoveryStore.list()[0].content).toBe('new');
	});

	it('does not rewrite an unchanged snapshot', () => {
		const storage = new LimitedStorage(10_000);
		const snapshot = {
			id: 'one',
			path: 'one.md',
			title: 'One',
			content: 'content',
			updatedAt: 1,
		};

		expect(recoveryStore.save(snapshot, storage)).toBe(true);
		expect(recoveryStore.save({ ...snapshot, updatedAt: 2 }, storage)).toBe(true);
		expect(storage.setCalls).toBe(1);
	});

	it('evicts older snapshots when storage quota is reached', () => {
		const storage = new LimitedStorage(150);
		recoveryStore.save(
			{
				id: 'old',
				path: 'old.md',
				title: 'Old',
				content: 'old content',
				updatedAt: 1,
			},
			storage,
		);

		const saved = recoveryStore.save(
			{
				id: 'new',
				path: 'new.md',
				title: 'New',
				content: 'new content that must survive',
				updatedAt: 2,
			},
			storage,
		);

		expect(saved).toBe(true);
		expect(recoveryStore.list(storage).map((item) => item.id)).toEqual(['new']);
	});

	it('preserves the previous recovery state when the current snapshot cannot fit', () => {
		const storage = new LimitedStorage(180);
		recoveryStore.save(
			{
				id: 'old',
				path: 'old.md',
				title: 'Old',
				content: 'safe',
				updatedAt: 1,
			},
			storage,
		);

		const saved = recoveryStore.save(
			{
				id: 'huge',
				path: 'huge.md',
				title: 'Huge',
				content: 'x'.repeat(500),
				updatedAt: 2,
			},
			storage,
		);

		expect(saved).toBe(false);
		expect(recoveryStore.list(storage).map((item) => item.id)).toEqual(['old']);
	});

	it('restores an unsaved snapshot after an abrupt restart', () => {
		const storage = new LimitedStorage(10_000);
		recoveryStore.save(
			{
				id: 'unsaved-tab',
				path: '',
				title: 'Untitled.md',
				content: '# Draft that was never saved',
				updatedAt: 42,
			},
			storage,
		);

		const restoredAfterRestart = recoveryStore.list(storage);

		expect(restoredAfterRestart).toEqual([
			{
				id: 'unsaved-tab',
				path: '',
				title: 'Untitled.md',
				content: '# Draft that was never saved',
				updatedAt: 42,
			},
		]);
	});

	it('ignores corrupted entries while preserving valid recovery data', () => {
		const storage = new LimitedStorage(10_000);
		storage.setItem(
			'draftly.recovery.v1',
			JSON.stringify([
				{
					id: 'valid',
					path: 'valid.md',
					title: 'Valid',
					content: 'safe',
					updatedAt: 1,
				},
				{ id: 'invalid', content: 123 },
			]),
		);

		expect(recoveryStore.list(storage).map((item) => item.id)).toEqual(['valid']);
	});
});
