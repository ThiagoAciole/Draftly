import { invoke } from '@tauri-apps/api/core';

export type AppMode = 'app' | 'installer' | 'uninstall';
export type OSType = 'macos' | 'windows' | 'linux' | 'unknown';

export interface InstallStatus {
	is_installed: boolean;
	all_users: boolean;
	version: string;
}

export interface InstallOptions {
	allUsers: boolean;
	registerMd: boolean;
	desktopShortcut: boolean;
	startMenu: boolean;
	launchAfter: boolean;
}

export interface MarkdownPreview {
	html: string;
	content: string;
	isFull: boolean;
}

function command<T>(name: string, args?: object): Promise<T> {
	return invoke<T>(name, args as Record<string, unknown> | undefined);
}

export const tauriCommands = {
	showWindow: () => command<void>('show_window'),
	getAppMode: () => command<AppMode>('get_app_mode'),
	getStartupFiles: () => command<string[]>('send_markdown_path'),
	isWindows11: () => command<boolean>('is_win11'),
	getOsType: () => command<OSType>('get_os_type'),
	getSystemFonts: () => command<string[]>('get_system_fonts'),

	readFile: (path: string) => command<string>('read_file_content', { path }),
	writeFile: (path: string, content: string) =>
		command<void>('save_file_content', { path, content }),
	writeBinaryFile: (path: string, data: number[]) =>
		command<void>('save_file_binary', { path, data }),
	copyFile: (src: string, dest: string) => command<void>('copy_file', { src, dest }),
	deleteFile: (path: string) => command<void>('delete_file', { path }),
	renameFile: (oldPath: string, newPath: string) =>
		command<void>('rename_file', { oldPath, newPath }),
	revealFile: (path: string) => command<void>('open_file_folder', { path }),
	listDirectory: (path: string) => command<string[]>('list_directory_contents', { path }),

	openMarkdown: (path: string) => command<string>('open_markdown', { path }),
	openMarkdownPreview: async (path: string, maxBytes: number): Promise<MarkdownPreview> => {
		const [html, content, isFull] = await command<[string, string, boolean]>(
			'open_markdown_preview',
			{ path, maxBytes },
		);
		return { html, content, isFull };
	},
	renderMarkdown: (content: string) => command<string>('render_markdown', { content }),

	watchFile: (path: string) => command<void>('watch_file', { path }),
	unwatchFile: (path?: string) =>
		command<void>('unwatch_file', path === undefined ? undefined : { path }),

	writeClipboardText: (text: string) =>
		command<void>('clipboard_write_text', { text }),
	readClipboardText: () => command<string>('clipboard_read_text'),
	readClipboardImage: (macosImageScaling: boolean) =>
		command<string>('clipboard_read_image', { macosImageScaling }),

	saveImage: (
		parentDir: string,
		filename: string,
		base64Data: string,
		imageDirectory: string,
	) =>
		command<string>('save_image', {
			parentDir,
			filename,
			base64Data,
			imageDirectory,
		}),
	copyFileToImageDirectory: (
		srcPath: string,
		parentDir: string,
		imageDirectory: string,
	) =>
		command<string>('copy_file_to_img', {
			srcPath,
			parentDir,
			imageDirectory,
		}),
	cleanupEmptyImageDirectory: (parentDir: string, imageDirectory: string) =>
		command<void>('cleanup_empty_img_dir', { parentDir, imageDirectory }),

	saveTheme: (theme: string) => command<void>('save_theme', { theme }),
	getSavedVscodeThemes: () => command<string[]>('get_saved_vscode_themes'),
	readVscodeTheme: (name: string) => command<string>('read_vscode_theme', { name }),
	fetchVscodeTheme: (url: string) => command<string>('fetch_vscode_theme', { url }),
	deleteVscodeTheme: (name: string) =>
		command<void>('delete_vscode_theme', { name }),

	checkInstallStatus: () => command<InstallStatus>('check_install_status'),
	installApp: (options: InstallOptions) => command<void>('install_app', options),
	uninstallApp: (targetAllUsers?: boolean) =>
		command<void>(
			'uninstall_app',
			targetAllUsers === undefined ? undefined : { targetAllUsers },
		),
};
