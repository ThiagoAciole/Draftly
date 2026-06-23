import type { DocumentSnapshot } from './document-session.js';

const RECOVERY_KEY = 'draftly.recovery.v1';

function readSnapshots(storage: Storage): DocumentSnapshot[] {
	try {
		const raw = storage.getItem(RECOVERY_KEY);
		if (!raw) return [];
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(
			(value): value is DocumentSnapshot =>
				typeof value === 'object' &&
				value !== null &&
				typeof (value as DocumentSnapshot).id === 'string' &&
				typeof (value as DocumentSnapshot).content === 'string' &&
				typeof (value as DocumentSnapshot).updatedAt === 'number',
		);
	} catch {
		return [];
	}
}

export const recoveryStore = {
	list(storage: Storage = localStorage): DocumentSnapshot[] {
		return readSnapshots(storage).sort((a, b) => b.updatedAt - a.updatedAt);
	},

	save(snapshot: DocumentSnapshot, storage: Storage = localStorage): void {
		const snapshots = readSnapshots(storage);
		const next = [
			snapshot,
			...snapshots.filter((item) => item.id !== snapshot.id),
		].slice(0, 20);
		storage.setItem(RECOVERY_KEY, JSON.stringify(next));
	},

	remove(id: string, storage: Storage = localStorage): void {
		const next = readSnapshots(storage).filter((item) => item.id !== id);
		if (next.length === 0) {
			storage.removeItem(RECOVERY_KEY);
			return;
		}
		storage.setItem(RECOVERY_KEY, JSON.stringify(next));
	},

	clear(storage: Storage = localStorage): void {
		storage.removeItem(RECOVERY_KEY);
	},
};
