import { tauriCommands } from '../../api/tauri.js';

export class FileService {
	static async read(path: string): Promise<string> {
		return tauriCommands.readFile(path);
	}

	static async write(path: string, content: string): Promise<void> {
		return tauriCommands.writeFile(path, content);
	}

	static async delete(path: string): Promise<void> {
		return tauriCommands.deleteFile(path);
	}

	static async rename(oldPath: string, newPath: string): Promise<void> {
		return tauriCommands.renameFile(oldPath, newPath);
	}

	static async watch(path: string): Promise<void> {
		return tauriCommands.watchFile(path);
	}

	static async unwatch(path?: string): Promise<void> {
		return tauriCommands.unwatchFile(path);
	}
}
