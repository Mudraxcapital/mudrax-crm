// ============================================================================
// Call recording retention policy (audio files on disk, not DB rows).
// ============================================================================

/** Default keep window when CALL_RECORDINGS_RETENTION_DAYS is unset. */
export const DEFAULT_CALL_RECORDINGS_RETENTION_DAYS = 90;

export function getCallRecordingsRetentionDays(): number {
  const raw = process.env.CALL_RECORDINGS_RETENTION_DAYS?.trim();
  if (!raw) return DEFAULT_CALL_RECORDINGS_RETENTION_DAYS;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_CALL_RECORDINGS_RETENTION_DAYS;
  return Math.min(parsed, 3650);
}
