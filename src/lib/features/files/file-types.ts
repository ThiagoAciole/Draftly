import htmlIcon from '../../../assets/file-icons/html.png';
import javascriptIcon from '../../../assets/file-icons/js.png';
import jsonIcon from '../../../assets/file-icons/json.png';
import markdownIcon from '../../../assets/file-icons/markdown.png';
import fallbackIcon from '../../../assets/icon.png';
import textIcon from '../../../assets/file-icons/txt.png';

export type DraftlyFileKind =
	| 'markdown'
	| 'text'
	| 'json'
	| 'code'
	| 'config'
	| 'web'
	| 'unknown';

export interface DraftlyFileType {
	extensions: string[];
	kind: DraftlyFileKind;
	language: string;
	canPreview: boolean;
	canFormat: boolean;
	canExport: boolean;
	icon: string;
}

export const FILE_TYPES: Record<string, DraftlyFileType> = {
	markdown: {
		extensions: ['md', 'markdown', 'mdown', 'mkd'],
		kind: 'markdown',
		language: 'markdown',
		canPreview: true,
		canFormat: false,
		canExport: true,
		icon: markdownIcon,
	},
	json: {
		extensions: ['json', 'jsonc'],
		kind: 'json',
		language: 'json',
		canPreview: true,
		canFormat: true,
		canExport: true,
		icon: jsonIcon,
	},
	text: {
		extensions: ['txt', 'log'],
		kind: 'text',
		language: 'plaintext',
		canPreview: false,
		canFormat: false,
		canExport: true,
		icon: textIcon,
	},
	javascript: {
		extensions: ['js', 'jsx'],
		kind: 'code',
		language: 'javascript',
		canPreview: false,
		canFormat: false,
		canExport: false,
		icon: javascriptIcon,
	},
	typescript: {
		extensions: ['ts', 'tsx'],
		kind: 'code',
		language: 'typescript',
		canPreview: false,
		canFormat: false,
		canExport: false,
		icon: javascriptIcon,
	},
	html: {
		extensions: ['html', 'htm'],
		kind: 'web',
		language: 'html',
		canPreview: false,
		canFormat: false,
		canExport: false,
		icon: htmlIcon,
	},
	css: {
		extensions: ['css'],
		kind: 'web',
		language: 'css',
		canPreview: false,
		canFormat: false,
		canExport: false,
		icon: fallbackIcon,
	},
	rust: {
		extensions: ['rs'],
		kind: 'code',
		language: 'rust',
		canPreview: false,
		canFormat: false,
		canExport: false,
		icon: fallbackIcon,
	},
	python: {
		extensions: ['py'],
		kind: 'code',
		language: 'python',
		canPreview: false,
		canFormat: false,
		canExport: false,
		icon: fallbackIcon,
	},
	shell: {
		extensions: ['sh', 'bash'],
		kind: 'code',
		language: 'shell',
		canPreview: false,
		canFormat: false,
		canExport: false,
		icon: fallbackIcon,
	},
	powershell: {
		extensions: ['ps1'],
		kind: 'code',
		language: 'powershell',
		canPreview: false,
		canFormat: false,
		canExport: false,
		icon: fallbackIcon,
	},
	yaml: {
		extensions: ['yaml', 'yml'],
		kind: 'config',
		language: 'yaml',
		canPreview: false,
		canFormat: false,
		canExport: false,
		icon: fallbackIcon,
	},
	sql: {
		extensions: ['sql'],
		kind: 'code',
		language: 'sql',
		canPreview: false,
		canFormat: false,
		canExport: false,
		icon: fallbackIcon,
	},
	xml: {
		extensions: ['xml'],
		kind: 'config',
		language: 'xml',
		canPreview: false,
		canFormat: false,
		canExport: false,
		icon: fallbackIcon,
	},
};

const EXTENSION_MAP = (() => {
	const map: Record<string, string> = {};
	for (const [key, type] of Object.entries(FILE_TYPES)) {
		for (const ext of type.extensions) {
			map[ext.toLowerCase()] = key;
		}
	}
	return map;
})();

export function getFileTypeByExtension(ext: string): DraftlyFileType {
	const cleanExt = ext.replace(/^\./, '').toLowerCase();
	const typeKey = EXTENSION_MAP[cleanExt];
	if (typeKey && FILE_TYPES[typeKey]) {
		return FILE_TYPES[typeKey];
	}
	return {
		extensions: [cleanExt],
		kind: 'unknown',
		language: 'plaintext',
		canPreview: false,
		canFormat: false,
		canExport: false,
		icon: fallbackIcon,
	};
}

export function getFileType(path: string): DraftlyFileType {
	if (!path || path === 'HOME') {
		return {
			extensions: [],
			kind: 'unknown',
			language: 'plaintext',
			canPreview: false,
			canFormat: false,
			canExport: false,
			icon: fallbackIcon,
		};
	}
	const ext = path.split('.').pop()?.toLowerCase() || '';
	return getFileTypeByExtension(ext);
}

export function isMarkdownPath(path: string): boolean {
	if (path === '') return true;
	const ext = path.split('.').pop()?.toLowerCase() || '';
	const type = getFileTypeByExtension(ext);
	return type.kind === 'markdown';
}

export function isPlainTextPath(path: string): boolean {
	const ext = path.split('.').pop()?.toLowerCase() || '';
	const type = getFileTypeByExtension(ext);
	return type.kind === 'text';
}

export function getLanguage(path: string): string {
	if (!path) return 'markdown';
	return getFileType(path).language;
}

export function getFileIcon(path: string): string {
	return getFileType(path).icon;
}

export const MARKDOWN_EXTENSIONS = ['.md', '.markdown', '.mdown', '.mkd'];
