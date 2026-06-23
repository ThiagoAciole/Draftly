export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'conflict';

export interface DocumentSnapshot {
	id: string;
	path: string;
	title: string;
	content: string;
	updatedAt: number;
}

export interface DocumentSession {
	tabId: string;
	path: string;
	status: SaveStatus;
	lastSavedContent: string;
	lastSavedAt: number | null;
	externalContent: string | null;
}

export function createDocumentSession(
	tabId: string,
	path = '',
	content = '',
): DocumentSession {
	return {
		tabId,
		path,
		status: 'idle',
		lastSavedContent: content,
		lastSavedAt: null,
		externalContent: null,
	};
}

export function markSessionSaved(
	session: DocumentSession,
	content: string,
	now = Date.now(),
): DocumentSession {
	return {
		...session,
		status: 'saved',
		lastSavedContent: content,
		lastSavedAt: now,
		externalContent: null,
	};
}

export function markSessionConflict(
	session: DocumentSession,
	externalContent: string,
): DocumentSession {
	return {
		...session,
		status: 'conflict',
		externalContent,
	};
}
