import { TabFileType } from "../types";

export const IMAGE_EXTENSIONS = [
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "svg",
  "bmp",
  "ico",
] as const;

export const OPENABLE_EXTENSIONS = [
  "md",
  "markdown",
  "txt",
  "html",
  "htm",
  "mhtml",
  "css",
  "js",
  "php",
  "pdf",
  ...IMAGE_EXTENSIONS,
] as const;

export function getFileExtension(nameOrPath?: string | null): string {
  if (!nameOrPath) return "";
  const trimmed = nameOrPath.trim();
  const lastDot = trimmed.lastIndexOf(".");
  if (lastDot < 0 || lastDot === trimmed.length - 1) return "";
  return trimmed.slice(lastDot + 1).toLowerCase();
}

export function isOpenableFilename(nameOrPath?: string | null): boolean {
  const ext = getFileExtension(nameOrPath);
  return (OPENABLE_EXTENSIONS as readonly string[]).includes(ext);
}

export function getTabFileType(nameOrPath?: string | null): TabFileType {
  const ext = getFileExtension(nameOrPath);
  if ((IMAGE_EXTENSIONS as readonly string[]).includes(ext)) {
    return "image";
  }
  switch (ext) {
    case "html":
    case "htm":
      return "html";
    case "mhtml":
      return "mhtml";
    case "css":
      return "css";
    case "js":
      return "js";
    case "php":
      return "php";
    case "pdf":
      return "pdf";
    case "txt":
      return "text";
    default:
      return "markdown";
  }
}

export function isWebViewFileType(fileType?: TabFileType | null): boolean {
  return fileType === "html" || fileType === "mhtml";
}

export function isCodeFileType(fileType?: TabFileType | null): boolean {
  return fileType === "css" || fileType === "js" || fileType === "php";
}

export function isBinaryViewerFileType(fileType?: TabFileType | null): boolean {
  return fileType === "pdf" || fileType === "image";
}

export function getMimeTypeForFilename(nameOrPath?: string | null): string {
  const ext = getFileExtension(nameOrPath);
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "svg":
      return "image/svg+xml";
    case "bmp":
      return "image/bmp";
    case "ico":
      return "image/x-icon";
    default:
      return "application/octet-stream";
  }
}
