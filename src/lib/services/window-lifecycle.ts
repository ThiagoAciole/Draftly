const WINDOW_SESSION_KEY = 'savedTabsData';

export interface WindowSessionStorage {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
	removeItem(key: string): void;
}

export interface ClosableTab {
	id: string;
	path: string;
	isDirty: boolean;
}

export function restoreWindowSession(
	enabled: boolean,
	storage: WindowSessionStorage,
	restore: (value: string) => void,
) {
	if (!enabled) return false;
	const value = storage.getItem(WINDOW_SESSION_KEY);
	if (!value) return false;
	restore(value);
	return true;
}

export function persistWindowSession(
	enabled: boolean,
	storage: WindowSessionStorage,
	serialize: () => string,
) {
	if (!enabled) return false;
	storage.setItem(WINDOW_SESSION_KEY, serialize());
	return true;
}

export function clearWindowSession(storage: WindowSessionStorage) {
	storage.removeItem(WINDOW_SESSION_KEY);
}

export async function flushDirtyFileTabs(
	tabs: ClosableTab[],
	options: {
		save: (tabId: string) => Promise<boolean>;
		cancelPending: (tabId: string) => void;
		onError?: (tabId: string, error: unknown) => void;
	},
) {
	let allSaved = true;
	for (const tab of tabs) {
		if (!tab.isDirty || !tab.path) continue;
		options.cancelPending(tab.id);
		try {
			if (!(await options.save(tab.id))) allSaved = false;
		} catch (error) {
			allSaved = false;
			options.onError?.(tab.id, error);
		}
	}
	return allSaved;
}

export async function saveTabsSequentially(
	tabs: { id: string }[],
	options: {
		beforeSave: (tabId: string) => void | Promise<void>;
		save: (tabId: string) => Promise<boolean>;
	},
) {
	for (const tab of tabs) {
		await options.beforeSave(tab.id);
		if (!(await options.save(tab.id))) return false;
	}
	return true;
}
