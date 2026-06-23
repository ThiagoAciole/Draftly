import { describe, expect, it, beforeEach, vi } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn().mockImplementation((cmd) => {
		if (cmd === 'get_os_type') return Promise.resolve('windows');
		return Promise.resolve();
	}),
	convertFileSrc: (p: string) => p,
}));

import { tabManager } from './tabs.svelte.js';

describe('tab navigation history', () => {
	beforeEach(() => {
		tabManager.closeAll();
	});

	it('initializes tab history with path instead of content', () => {
		const testPath = 'C:\\notes\\note.md';
		tabManager.addTab(testPath, '# Note Content');

		const tab = tabManager.activeTab;
		expect(tab).toBeDefined();
		expect(tab?.path).toBe(testPath);
		expect(tab?.navigationHistory).toEqual([testPath]);
		expect(tab?.navigationIndex).toBe(0);
	});

	it('supports navigate, canGoBack, canGoForward, goBack and goForward', () => {
		const path1 = 'note1.md';
		const path2 = 'note2.md';
		const path3 = 'note3.md';

		tabManager.addTab(path1, 'content 1');
		const tabId = tabManager.activeTabId!;

		expect(tabManager.canGoBack(tabId)).toBe(false);
		expect(tabManager.canGoForward(tabId)).toBe(false);

		// Navigate to note2
		tabManager.navigate(tabId, path2);
		expect(tabManager.activeTab?.path).toBe(path2);
		expect(tabManager.activeTab?.navigationHistory).toEqual([path1, path2]);
		expect(tabManager.activeTab?.navigationIndex).toBe(1);
		expect(tabManager.canGoBack(tabId)).toBe(true);
		expect(tabManager.canGoForward(tabId)).toBe(false);

		// Navigate to note3
		tabManager.navigate(tabId, path3);
		expect(tabManager.activeTab?.path).toBe(path3);
		expect(tabManager.activeTab?.navigationHistory).toEqual([path1, path2, path3]);
		expect(tabManager.activeTab?.navigationIndex).toBe(2);

		// Go back to note2
		const backPath = tabManager.goBack(tabId);
		expect(backPath).toBe(path2);
		expect(tabManager.activeTab?.path).toBe(path2);
		expect(tabManager.activeTab?.navigationIndex).toBe(1);
		expect(tabManager.canGoForward(tabId)).toBe(true);

		// Go back to note1
		const backPath2 = tabManager.goBack(tabId);
		expect(backPath2).toBe(path1);
		expect(tabManager.activeTab?.path).toBe(path1);
		expect(tabManager.activeTab?.navigationIndex).toBe(0);
		expect(tabManager.canGoBack(tabId)).toBe(false);

		// Go forward to note2
		const forwardPath = tabManager.goForward(tabId);
		expect(forwardPath).toBe(path2);
		expect(tabManager.activeTab?.path).toBe(path2);
		expect(tabManager.activeTab?.navigationIndex).toBe(1);

		// Navigate to a new path from note2, clipping the history
		const path4 = 'note4.md';
		tabManager.navigate(tabId, path4);
		expect(tabManager.activeTab?.navigationHistory).toEqual([path1, path2, path4]);
		expect(tabManager.activeTab?.navigationIndex).toBe(2);
		expect(tabManager.canGoForward(tabId)).toBe(false);
	});
});
