/**
 * autosave.ts
 *
 * Declarative, testable autosave debounce service.
 *
 * Encapsulates the per-tab timer management that currently lives inline in
 * LayoutView.svelte. LayoutView delegates to this service; the service has
 * no Svelte/Tauri dependency so it can be unit-tested in isolation.
 *
 * Lifecycle contract:
 *   1. Call tick() every time the reactive tab list changes.
 *   2. Call cancelTab(id) when you're committing a save or discard for a tab.
 *   3. Call destroy() when unmounting to clear all pending timers.
 */

export interface AutosaveTabSnapshot {
	id: string;
	path: string;
	isDirty: boolean;
	isEditing: boolean;
	isSplit: boolean;
	rawContent: string;
}

export interface AutosaveOptions {
	/** Debounce delay in milliseconds. Default: 1500. */
	debounceMs?: number;
	/** Called when a tab's debounce fires. Should call saveContent(id). */
	onSave: (tabId: string) => Promise<void>;
	/** Called when an autosave fails. */
	onError?: (tabId: string, error: unknown) => void;
}

export interface AutosaveService {
	/**
	 * Process the current tab list. Arms/disarms timers based on eligibility.
	 * Call this from a reactive effect whenever tabs change.
	 */
	tick(tabs: AutosaveTabSnapshot[], enabled: boolean): void;
	/** Cancel any pending timer for a specific tab (e.g. before explicit save). */
	cancelTab(tabId: string): void;
	/** Clear all timers. Call on component unmount. */
	destroy(): void;
}

/**
 * Creates an autosave service.
 *
 * @example
 * const autosave = createAutosaveService({
 *   debounceMs: 1500,
 *   onSave: (id) => saveContent(id),
 *   onError: (id, e) => addToast("Auto-save failed", "error"),
 * });
 *
 * // Inside a Svelte $effect (must be inside untrack() to avoid extra reruns):
 * autosave.tick(
 *   tabManager.tabs.map(t => ({ ...t, isEditing: t.isEditing, isSplit: t.isSplit })),
 *   settings.autoSave && !settings.confirmBeforeSave,
 * );
 */
export function createAutosaveService(opts: AutosaveOptions): AutosaveService {
	const debounceMs = opts.debounceMs ?? 1500;
	const timers = new Map<string, ReturnType<typeof setTimeout>>();
	const lastContentRef = new Map<string, string>();

	function isEligible(tab: AutosaveTabSnapshot): boolean {
		return tab.isDirty && tab.path !== "" && (tab.isEditing || tab.isSplit);
	}

	function clearTab(id: string): void {
		const t = timers.get(id);
		if (t !== undefined) {
			clearTimeout(t);
			timers.delete(id);
		}
		lastContentRef.delete(id);
	}

	function arm(tab: AutosaveTabSnapshot): void {
		const existing = timers.get(tab.id);
		if (existing !== undefined) clearTimeout(existing);
		lastContentRef.set(tab.id, tab.rawContent);
		const timer = setTimeout(async () => {
			timers.delete(tab.id);
			try {
				await opts.onSave(tab.id);
			} catch (e) {
				opts.onError?.(tab.id, e);
			}
		}, debounceMs);
		timers.set(tab.id, timer);
	}

	return {
		tick(tabs, enabled) {
			if (!enabled) {
				// Autosave disabled — clear everything
				for (const t of timers.values()) clearTimeout(t);
				timers.clear();
				lastContentRef.clear();
				return;
			}

			const seenIds = new Set<string>();

			for (const tab of tabs) {
				seenIds.add(tab.id);

				if (!isEligible(tab)) {
					clearTab(tab.id);
					continue;
				}

				const prevRef = lastContentRef.get(tab.id);
				const contentChanged = prevRef !== tab.rawContent;
				const alreadyArmed = timers.has(tab.id);

				if (!contentChanged && alreadyArmed) {
					// No new edit AND timer is already running — don't reset it.
					// This prevents foreground tab typing from resetting background tab timers.
					continue;
				}

				// New content or tab just became eligible — (re)arm.
				arm(tab);
			}

			// Clean up closed tabs
			for (const id of timers.keys()) {
				if (!seenIds.has(id)) clearTab(id);
			}
		},

		cancelTab(tabId) {
			clearTab(tabId);
		},

		destroy() {
			for (const t of timers.values()) clearTimeout(t);
			timers.clear();
			lastContentRef.clear();
		},
	};
}
