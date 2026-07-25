const IMAGE_FILE_NAME = /\.(avif|gif|jpe?g|png|svg|webp)$/i;

type ImageFile = Pick<File, "name" | "type">;

export function isImportableImage(file: ImageFile) {
  return file.type.startsWith("image/") || IMAGE_FILE_NAME.test(file.name);
}

export function isRelativeImagePath(source: string) {
  return (
    Boolean(source) &&
    !source.startsWith("/") &&
    !source.startsWith("\\") &&
    !/^[a-z][a-z\d+.-]*:/i.test(source)
  );
}

export function getImageAssetAbsolutePath(
  documentPath: string,
  relativeImagePath: string,
) {
  const separator = documentPath.includes("\\") ? "\\" : "/";
  const directoryIndex = Math.max(
    documentPath.lastIndexOf("/"),
    documentPath.lastIndexOf("\\"),
  );
  const directory = documentPath.slice(0, directoryIndex);
  const normalizedImagePath = relativeImagePath.replace(/[\\/]/g, separator);

  return `${directory}${separator}${normalizedImagePath}`;
}
