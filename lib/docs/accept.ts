export const MAX_DOC_BYTES = 15 * 1024 * 1024;
export const MAX_DOC_COUNT = 10;

export const ACCEPTED_MEDIA = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/heic",
  "image/heif",
  "image/webp",
]);

export const ACCEPTED_EXT = new Set(["pdf", "jpg", "jpeg", "png", "heic", "heif", "webp"]);

export const REJECT_LINE = "Use a PDF, JPEG, PNG, HEIC, or WebP under 15 MB.";
export const LIMIT_LINE = "Ten files is the limit.";
export const FAILED_READ_NOTE =
  "Fox could not read this file. Type a note or skip. No dollar amounts were invented.";
export const NO_TEXT_LAYER_NOTE = "This file has no text layer. Type a note or Skip.";
export const RECEIVED_NOTE = "Document received";

export function isUnreadNote(note?: string | null) {
  return note === FAILED_READ_NOTE || note === NO_TEXT_LAYER_NOTE;
}

/** Thread line when the dropped file’s text layer is empty. No dollars. */
export function unreadDropBytesCopy(name: string, size: number) {
  const shown = String(name ?? "").trim() || "file";
  const bytes = Number.isFinite(size) ? Math.max(0, Math.round(size)) : 0;
  return `${shown} · ${bytes.toLocaleString("en-US")} bytes`;
}

export const ACCEPT_ATTR =
  ".pdf,.jpg,.jpeg,.png,.heic,.heif,.webp,application/pdf,image/jpeg,image/png,image/heic,image/heif,image/webp";

export function extensionOf(name: string) {
  const parts = name.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

export function isAcceptedFile(name: string, type?: string | null, size?: number) {
  if (typeof size === "number" && (size <= 0 || size > MAX_DOC_BYTES)) return false;
  const media = (type || "").toLowerCase();
  if (media && ACCEPTED_MEDIA.has(media)) return true;
  return ACCEPTED_EXT.has(extensionOf(name));
}

export function mediaTypeOf(name: string, type?: string | null) {
  const media = (type || "").toLowerCase();
  if (media && ACCEPTED_MEDIA.has(media)) {
    return media === "image/jpg" ? "image/jpeg" : media;
  }
  const ext = extensionOf(name);
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "heic" || ext === "heif") return "image/heic";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  return media || "application/octet-stream";
}
