import htmlFileIcon from "../assets/file-html.png";
import javascriptFileIcon from "../assets/file-js.png";
import jsonFileIcon from "../assets/file-json.png";
import markdownFileIcon from "../assets/file-markdown.png";
import pythonFileIcon from "../assets/file-py.png";
import textFileIcon from "../assets/file-txt.png";
import typescriptFileIcon from "../assets/file-ts.png";
import { getFileExtension } from "./languages";

const FILE_ICONS: Record<string, string> = {
  md: markdownFileIcon,
  json: jsonFileIcon,
  js: javascriptFileIcon,
  ts: typescriptFileIcon,
  py: pythonFileIcon,
  html: htmlFileIcon,
  txt: textFileIcon,
};

export function getFileIcon(pathOrName: string): string {
  return FILE_ICONS[getFileExtension(pathOrName) ?? ""] ?? textFileIcon;
}
