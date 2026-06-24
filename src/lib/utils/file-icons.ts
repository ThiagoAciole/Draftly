import { getFileIcon as _getFileIcon } from "../features/files/file-types.js";

export function getFileIcon(path: string): string {
  return _getFileIcon(path);
}
