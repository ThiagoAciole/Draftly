import { beforeEach, describe, expect, it } from 'vitest';
import { recoveryStore } from './recovery.js';

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
});
