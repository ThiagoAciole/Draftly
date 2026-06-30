/**
 * autosave.test.ts
 *
 * Unit tests for the autosave debounce service.
 * Uses fake timers — no filesystem or Tauri dependency.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createAutosaveService } from "./autosave.js";
import type { AutosaveTabSnapshot } from "./autosave.js";

function makeTab(overrides: Partial<AutosaveTabSnapshot> = {}): AutosaveTabSnapshot {
	return {
		id: "tab-1",
		path: "/docs/note.md",
		isDirty: true,
		isEditing: true,
		isSplit: false,
		rawContent: "hello",
		...overrides,
	};
}

describe("createAutosaveService", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("calls onSave after debounce fires for eligible tab", async () => {
		const onSave = vi.fn().mockResolvedValue(undefined);
		const svc = createAutosaveService({ debounceMs: 1000, onSave });

		svc.tick([makeTab()], true);
		expect(onSave).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1000);
		expect(onSave).toHaveBeenCalledWith("tab-1");

		svc.destroy();
	});

	it("does not call onSave when autosave is disabled", async () => {
		const onSave = vi.fn().mockResolvedValue(undefined);
		const svc = createAutosaveService({ debounceMs: 500, onSave });

		svc.tick([makeTab()], false);
		await vi.advanceTimersByTimeAsync(1000);
		expect(onSave).not.toHaveBeenCalled();

		svc.destroy();
	});

	it("does not arm timer for tab with no path (untitled)", async () => {
		const onSave = vi.fn().mockResolvedValue(undefined);
		const svc = createAutosaveService({ debounceMs: 500, onSave });

		svc.tick([makeTab({ path: "" })], true);
		await vi.advanceTimersByTimeAsync(1000);
		expect(onSave).not.toHaveBeenCalled();

		svc.destroy();
	});

	it("does not arm timer for clean tab", async () => {
		const onSave = vi.fn().mockResolvedValue(undefined);
		const svc = createAutosaveService({ debounceMs: 500, onSave });

		svc.tick([makeTab({ isDirty: false })], true);
		await vi.advanceTimersByTimeAsync(1000);
		expect(onSave).not.toHaveBeenCalled();

		svc.destroy();
	});

	it("does not arm timer when tab is not editing and not split", async () => {
		const onSave = vi.fn().mockResolvedValue(undefined);
		const svc = createAutosaveService({ debounceMs: 500, onSave });

		svc.tick([makeTab({ isEditing: false, isSplit: false })], true);
		await vi.advanceTimersByTimeAsync(1000);
		expect(onSave).not.toHaveBeenCalled();

		svc.destroy();
	});

	it("resets debounce when content changes", async () => {
		const onSave = vi.fn().mockResolvedValue(undefined);
		const svc = createAutosaveService({ debounceMs: 1000, onSave });

		svc.tick([makeTab({ rawContent: "v1" })], true);
		await vi.advanceTimersByTimeAsync(500);

		// New content before the 1000ms debounce fires
		svc.tick([makeTab({ rawContent: "v2" })], true);
		await vi.advanceTimersByTimeAsync(500);

		// First debounce should have been cancelled — hasn't fired yet
		expect(onSave).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(500);
		expect(onSave).toHaveBeenCalledOnce();

		svc.destroy();
	});

	it("does not reset debounce for unchanged content on background tab", async () => {
		const onSave = vi.fn().mockResolvedValue(undefined);
		const svc = createAutosaveService({ debounceMs: 1000, onSave });

		const tab1 = makeTab({ id: "tab-1", rawContent: "v1" });
		const tab2 = makeTab({ id: "tab-2", rawContent: "initial" });

		svc.tick([tab1, tab2], true);
		await vi.advanceTimersByTimeAsync(500);

		// Only tab2 content changes — tab1 timer should not be reset
		svc.tick([makeTab({ id: "tab-1", rawContent: "v1" }), makeTab({ id: "tab-2", rawContent: "changed" })], true);
		await vi.advanceTimersByTimeAsync(500);

		// tab1 should have fired at 1000ms, tab2 not yet (1000ms still pending from second tick)
		expect(onSave).toHaveBeenCalledWith("tab-1");

		svc.destroy();
	});

	it("cancelTab prevents onSave from firing", async () => {
		const onSave = vi.fn().mockResolvedValue(undefined);
		const svc = createAutosaveService({ debounceMs: 1000, onSave });

		svc.tick([makeTab()], true);
		svc.cancelTab("tab-1");
		await vi.advanceTimersByTimeAsync(2000);
		expect(onSave).not.toHaveBeenCalled();

		svc.destroy();
	});

	it("destroy clears all pending timers", async () => {
		const onSave = vi.fn().mockResolvedValue(undefined);
		const svc = createAutosaveService({ debounceMs: 1000, onSave });

		svc.tick([makeTab({ id: "a" }), makeTab({ id: "b" })], true);
		svc.destroy();
		await vi.advanceTimersByTimeAsync(2000);
		expect(onSave).not.toHaveBeenCalled();
	});

	it("calls onError when onSave throws", async () => {
		const error = new Error("disk full");
		const onSave = vi.fn().mockRejectedValue(error);
		const onError = vi.fn();
		const svc = createAutosaveService({ debounceMs: 500, onSave, onError });

		svc.tick([makeTab()], true);
		await vi.advanceTimersByTimeAsync(1000);
		expect(onError).toHaveBeenCalledWith("tab-1", error);

		svc.destroy();
	});

	it("clears timer for closed tabs on next tick", async () => {
		const onSave = vi.fn().mockResolvedValue(undefined);
		const svc = createAutosaveService({ debounceMs: 1000, onSave });

		svc.tick([makeTab({ id: "tab-x" })], true);
		// Tab is closed — next tick has empty list
		svc.tick([], true);
		await vi.advanceTimersByTimeAsync(2000);
		expect(onSave).not.toHaveBeenCalled();

		svc.destroy();
	});
});
