/**
 * keyboard-shortcuts.ts
 *
 * Provides a declarative, testable service for registering global keyboard shortcuts.
 * Centralizes shortcut logic so it can be tested without DOM coupling and adopted
 * progressively from LayoutView.svelte.
 *
 * Usage:
 *   const kb = createKeyboardService([
 *     { key: "s", ctrl: true, handler: () => saveContent() },
 *   ]);
 *   // In a Svelte $effect:
 *   $effect(() => {
 *     kb.mount();
 *     return kb.destroy;
 *   });
 */

export interface KeyboardShortcut {
	key: string;
	ctrl?: boolean;
	shift?: boolean;
	alt?: boolean;
	meta?: boolean;
	/** Prevent default browser action (default: true) */
	preventDefault?: boolean;
	handler: () => void | Promise<void>;
}

function matches(e: KeyboardEvent, s: KeyboardShortcut): boolean {
	const keyMatch = e.key.toLowerCase() === s.key.toLowerCase();
	const ctrlMatch = !!e.ctrlKey === !!(s.ctrl ?? false);
	const shiftMatch = !!e.shiftKey === !!(s.shift ?? false);
	const altMatch = !!e.altKey === !!(s.alt ?? false);
	const metaMatch = !!e.metaKey === !!(s.meta ?? false);
	return keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch;
}

export interface KeyboardService {
	/** Attach the global keydown listener to window. */
	mount(): void;
	/** Detach the global keydown listener from window. */
	destroy(): void;
	/** Replace the active shortcut list at runtime. */
	update(shortcuts: KeyboardShortcut[]): void;
}

/**
 * Creates a keyboard shortcut service.
 * Call mount() to activate and destroy() to clean up.
 */
export function createKeyboardService(
	initialShortcuts: KeyboardShortcut[],
): KeyboardService {
	let shortcuts = [...initialShortcuts];

	function handleKeyDown(e: KeyboardEvent): void {
		for (const shortcut of shortcuts) {
			if (matches(e, shortcut)) {
				if (shortcut.preventDefault !== false) {
					e.preventDefault();
				}
				shortcut.handler();
				return;
			}
		}
	}

	return {
		mount() {
			window.addEventListener("keydown", handleKeyDown);
		},
		destroy() {
			window.removeEventListener("keydown", handleKeyDown);
		},
		update(next: KeyboardShortcut[]) {
			shortcuts = [...next];
		},
	};
}
