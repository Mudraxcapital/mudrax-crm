// ============================================================================
// Follow Up lead-status policy helpers.
// ============================================================================

/** True when the catalog stage name is a Follow Up status. */
export function isFollowUpStageName(name: string): boolean {
  const trimmed = name.trim();
  return /^follow[\s_-]*ups?$/i.test(trimmed);
}
