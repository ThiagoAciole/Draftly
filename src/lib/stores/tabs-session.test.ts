import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn().mockImplementation((cmd) => {
		if (cmd === 'get_os_type') return Promise.resolve('windows');
		return Promise.resolve();
	}),
	convertFileSrc: (path: string) => path,
}));

import { tabManager } from './tabs.svelte.js';

describe('tab session recovery', () => {
	beforeEach(() => {
		tabManager.closeAll();
	});

	it('restores dirty unsaved content after an abrupt restart', () => {
		tabManager.addNewTab('markdown');
		const tabId = tabManager.activeTabId!;
		tabManager.updateTabRawContent(tabId, '# Unsaved draft');
		const serialized = tabManager.serializeState();

		tabManager.closeAll();
		tabManager.restoreState(serialized);

		expect(tabManager.activeTab?.rawContent).toBe('# Unsaved draft');
		expect(tabManager.activeTab?.isDirty).toBe(true);
		expect(tabManager.activeTab?.path).toBe('');
	});

	it('restores the active tab and navigation state', () => {
		tabManager.addTab('first.md', '# First');
		tabManager.addTab('second.md', '# Second');
		const activeTabId = tabManager.activeTabId;
		const serialized = tabManager.serializeState();

		tabManager.closeAll();
		tabManager.restoreState(serialized);

		expect(tabManager.activeTabId).toBe(activeTabId);
		expect(tabManager.activeTab?.path).toBe('second.md');
		expect(tabManager.activeTab?.navigationHistory).toEqual(['second.md']);
	});
});
