// ============================================================================
// src/shared/spreadsheet/uploadSecurity.ts
//
// Hardening for Excel/CSV imports — size, extension, MIME, and safe parse
// guards. Reused by lead import / lead-center without changing business
// mapping logic.
// ============================================================================

export const MAX_SPREADSHEET_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MiB

const ALLOWED_EXTENSIONS = [".csv", ".xlsx", ".xls"] as const;

const ALLOWED_MIME_TYPES = new Set([
  "text/csv",
  "application/csv",
  "text/plain",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream", // browsers sometimes send this for .xlsx
]);

export class SpreadsheetUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpreadsheetUploadError";
  }
}

export function assertSafeSpreadsheetUpload(input: {
  fileName: string;
  mimeType?: string | null;
  sizeBytes: number;
  maxBytes?: number;
}): void {
  const maxBytes = input.maxBytes ?? MAX_SPREADSHEET_UPLOAD_BYTES;
  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0) {
    throw new SpreadsheetUploadError("Uploaded file is empty.");
  }
  if (input.sizeBytes > maxBytes) {
    throw new SpreadsheetUploadError(
      `File exceeds the maximum allowed size of ${Math.floor(maxBytes / (1024 * 1024))} MB.`,
    );
  }

  const base = input.fileName.split(/[/\\]/).pop() ?? "";
  if (!base || base.includes("\0")) {
    throw new SpreadsheetUploadError("Invalid file name.");
  }

  const lower = base.toLowerCase();
  const extensionOk = ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
  if (!extensionOk) {
    throw new SpreadsheetUploadError(
      "Unsupported file type. Allowed: .csv, .xlsx, .xls.",
    );
  }

  const mime = (input.mimeType ?? "").trim().toLowerCase();
  if (mime && !ALLOWED_MIME_TYPES.has(mime)) {
    // Extension already validated — reject only clearly hostile MIME values.
    if (mime.includes("javascript") || mime.includes("html") || mime.includes("wasm")) {
      throw new SpreadsheetUploadError("File MIME type is not allowed.");
    }
  }
}

/** Strip formula-injection prefixes from cell text (CSV/Excel formula abuse). */
export function sanitizeSpreadsheetCell(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^[=+\-@]/.test(trimmed)) {
    return `'${trimmed}`;
  }
  return trimmed.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}
