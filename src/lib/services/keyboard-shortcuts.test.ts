/**
 * keyboard-shortcuts.test.ts
 *
 * Unit tests for the keyboard shortcut service.
 * Runs in Node/JSDOM — no Tauri dependency.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createKeyboardService } from "./keyboard-shortcuts.js";
import type { KeyboardShortcut } from "./keyboard-shortcuts.js";

function makeKeyEvent(
	key: string,
	modifiers: { ctrlKey?: boolean; shiftKey?: boolean; altKey?: boolean; metaKey?: boolean } = {},
): KeyboardEvent {
	return new KeyboardEvent("keydown", {
		key,
		bubbles: true,
		cancelable: true,
		ctrlKey: modifiers.ctrlKey ?? false,
		shiftKey: modifiers.shiftKey ?? false,
		altKey: modifiers.altKey ?? false,
		metaKey: modifiers.metaKey ?? false,
	});
}

describe("createKeyboardService", () => {
	let addSpy: ReturnType<typeof vi.spyOn>;
	let removeSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		addSpy = vi.spyOn(window, "addEventListener");
		removeSpy = vi.spyOn(window, "removeEventListener");
	});

	it("registers listener on mount and removes on destroy", () => {
		const kb = createKeyboardService([]);
		kb.mount();
		expect(addSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
		kb.destroy();
		expect(removeSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
	});

	it("calls handler when matching shortcut fires", () => {
		const handler = vi.fn();
		const shortcuts: KeyboardShortcut[] = [
			{ key: "s", ctrl: true, handler },
		];
		const kb = createKeyboardService(shortcuts);
		kb.mount();

		const event = makeKeyEvent("s", { ctrlKey: true });
		window.dispatchEvent(event);

		expect(handler).toHaveBeenCalledOnce();
		kb.destroy();
	});

	it("does not call handler for non-matching key", () => {
		const handler = vi.fn();
		const kb = createKeyboardService([{ key: "s", ctrl: true, handler }]);
		kb.mount();

		window.dispatchEvent(makeKeyEvent("w", { ctrlKey: true }));
		expect(handler).not.toHaveBeenCalled();
		kb.destroy();
	});

	it("does not call handler when modifier does not match", () => {
		const handler = vi.fn();
		const kb = createKeyboardService([{ key: "s", ctrl: true, handler }]);
		kb.mount();

		// s without ctrl — should not match
		window.dispatchEvent(makeKeyEvent("s"));
		expect(handler).not.toHaveBeenCalled();
		kb.destroy();
	});

	it("respects shift modifier", () => {
		const handler = vi.fn();
		const kb = createKeyboardService([{ key: "p", ctrl: true, shift: true, handler }]);
		kb.mount();

		window.dispatchEvent(makeKeyEvent("p", { ctrlKey: true }));
		expect(handler).not.toHaveBeenCalled();

		window.dispatchEvent(makeKeyEvent("p", { ctrlKey: true, shiftKey: true }));
		expect(handler).toHaveBeenCalledOnce();
		kb.destroy();
	});

	it("update() replaces shortcuts at runtime", () => {
		const handlerA = vi.fn();
		const handlerB = vi.fn();
		const kb = createKeyboardService([{ key: "a", handler: handlerA }]);
		kb.mount();

		kb.update([{ key: "b", handler: handlerB }]);

		window.dispatchEvent(makeKeyEvent("a"));
		expect(handlerA).not.toHaveBeenCalled();

		window.dispatchEvent(makeKeyEvent("b"));
		expect(handlerB).toHaveBeenCalledOnce();
		kb.destroy();
	});

	it("handles case-insensitive key matching", () => {
		const handler = vi.fn();
		const kb = createKeyboardService([{ key: "S", ctrl: true, handler }]);
		kb.mount();

		window.dispatchEvent(makeKeyEvent("s", { ctrlKey: true }));
		expect(handler).toHaveBeenCalledOnce();
		kb.destroy();
	});

	it("preventDefault is called by default", () => {
		const handler = vi.fn();
		const kb = createKeyboardService([{ key: "s", ctrl: true, handler }]);
		kb.mount();

		const event = makeKeyEvent("s", { ctrlKey: true });
		const preventDefaultSpy = vi.spyOn(event, "preventDefault");
		window.dispatchEvent(event);

		expect(preventDefaultSpy).toHaveBeenCalled();
		kb.destroy();
	});

	it("skips preventDefault when preventDefault: false", () => {
		const handler = vi.fn();
		const kb = createKeyboardService([
			{ key: "s", ctrl: true, preventDefault: false, handler },
		]);
		kb.mount();

		const event = makeKeyEvent("s", { ctrlKey: true });
		const preventDefaultSpy = vi.spyOn(event, "preventDefault");
		window.dispatchEvent(event);

		expect(preventDefaultSpy).not.toHaveBeenCalled();
		kb.destroy();
	});
});
