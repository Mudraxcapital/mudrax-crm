// ============================================================================
// Helpers for Call Recording storage references (ADR 0006).
// ============================================================================

/** Server-stored audio under local/cloud disk — playable from Web CRM. */
export const SERVER_RECORDING_REF_PREFIX = "local:call-recordings/";

/** On-device Android capture — not fetchable by the server. */
export const ANDROID_LOCAL_RECORDING_REF_PREFIX = "android-local://call-recordings/";

export function isServerStoredRecordingReference(storageReference: string): boolean {
  return storageReference.startsWith(SERVER_RECORDING_REF_PREFIX);
}

export function isAndroidLocalRecordingReference(storageReference: string): boolean {
  return storageReference.startsWith(ANDROID_LOCAL_RECORDING_REF_PREFIX);
}

export function toServerRecordingReference(storageKey: string): string {
  return `local:${storageKey.replace(/^\/+/, "")}`;
}

/** Strip `local:` so the storage adapter resolves under its configured root. */
export function storageKeyFromRecordingReference(storageReference: string): string | null {
  if (!isServerStoredRecordingReference(storageReference)) return null;
  return storageReference.slice("local:".length);
}

export function guessRecordingContentType(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".m4a") || lower.endsWith(".mp4")) return "audio/mp4";
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".wav")) return "audio/wav";
  if (lower.endsWith(".ogg")) return "audio/ogg";
  return "application/octet-stream";
}
