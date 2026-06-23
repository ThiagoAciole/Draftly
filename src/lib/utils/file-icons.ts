import htmlIcon from '../../assets/file-icons/html.png';
import javascriptIcon from '../../assets/file-icons/js.png';
import jsonIcon from '../../assets/file-icons/json.png';
import markdownIcon from '../../assets/file-icons/markdown.png';
import fallbackIcon from '../../assets/icon.png';
import textIcon from '../../assets/file-icons/txt.png';

const fileIcons: Record<string, string> = {
	md: markdownIcon,
	markdown: markdownIcon,
	mdown: markdownIcon,
	mkd: markdownIcon,
	txt: textIcon,
	js: javascriptIcon,
	jsx: javascriptIcon,
	html: htmlIcon,
	htm: htmlIcon,
	json: jsonIcon,
};

export function getFileIcon(path: string): string {
	const fileName = path.split(/[/\\]/).pop() ?? path;
	const extension = fileName.includes('.')
		? fileName.split('.').pop()?.toLowerCase()
		: undefined;

	return (extension ? fileIcons[extension] : undefined) ?? fallbackIcon;
}
