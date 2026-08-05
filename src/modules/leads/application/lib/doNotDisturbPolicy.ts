// ============================================================================
// Do Not Disturb (DND) lead-status policy helpers.
// ============================================================================

export const DO_NOT_DISTURB_STAGE_NAME = "Do Not Disturb";

/** True when the catalog stage name is Do Not Disturb / DND. */
export function isDoNotDisturbStageName(name: string): boolean {
  const trimmed = name.trim();
  return /^do\s*not\s*disturb$/i.test(trimmed) || /^dnd$/i.test(trimmed);
}
