import { isMarkdownPath } from "../files/file-types.js";

export type RelativeMarkdownTarget = {
  path: string;
  hash: string;
};

export function decodeMarkdownLink(path: string) {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

export function getRelativeMarkdownTarget(
  href: string,
): RelativeMarkdownTarget | null {
  const pathWithoutHash = href.split("#")[0].split("?")[0];
  const isWindowsDrivePath = /^[a-z]:/i.test(href);
  const isProtocolRelativeExternal = href.startsWith("//");
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(href);

  if (
    !isMarkdownPath(pathWithoutHash) ||
    isProtocolRelativeExternal ||
    (hasScheme && !isWindowsDrivePath)
  ) {
    return null;
  }

  const hashIndex = href.indexOf("#");
  return {
    path: decodeMarkdownLink(pathWithoutHash),
    hash: hashIndex === -1 ? "" : href.slice(hashIndex + 1),
  };
}

export function normalizeComparableMarkdownPath(path: string, osType: string) {
  const normalized = path.replace(/\\/g, "/");
  const comparable = normalized.startsWith("//")
    ? `//${normalized.slice(2).replace(/\/+/g, "/")}`
    : normalized.replace(/\/+/g, "/");

  if (
    osType === "windows" ||
    /^[a-z]:/i.test(comparable) ||
    comparable.startsWith("//")
  ) {
    return comparable.toLowerCase();
  }
  return comparable;
}

export function isAbsoluteMarkdownPath(path: string) {
  return path.startsWith("/") || path.startsWith("\\") || /^[a-z]:/i.test(path);
}

export function resolveMarkdownTarget(basePath: string, relativePath: string) {
  if (isAbsoluteMarkdownPath(relativePath)) return relativePath;

  const parts = basePath.split(/[/\\]/);
  parts.pop();
  for (const part of relativePath.split(/[/\\]/)) {
    if (part === ".") continue;
    if (part === "..") parts.pop();
    else parts.push(part);
  }
  return parts.join("/");
}
