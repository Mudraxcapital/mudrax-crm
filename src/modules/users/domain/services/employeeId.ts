// ============================================================================
// src/modules/users/domain/services/employeeId.ts
//
// Auto Employee ID: MCS0001, MCS0002, …
// ============================================================================

const PREFIX = "MCS";

/** Formats a 1-based sequence number as MCS0001 (pads to at least 4 digits). */
export function formatEmployeeId(sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error(`Invalid employee id sequence: ${sequence}`);
  }
  const width = Math.max(4, String(sequence).length);
  return `${PREFIX}${String(sequence).padStart(width, "0")}`;
}

/** Parses MCS#### → sequence number, or null if not in the canonical format. */
export function parseEmployeeIdSequence(employeeId: string): number | null {
  const match = /^MCS(\d+)$/.exec(employeeId);
  if (!match?.[1]) return null;
  const value = Number.parseInt(match[1], 10);
  return Number.isFinite(value) ? value : null;
}

export function nextEmployeeId(latestEmployeeId: string | null): string {
  if (!latestEmployeeId) return formatEmployeeId(1);
  const current = parseEmployeeIdSequence(latestEmployeeId) ?? 0;
  return formatEmployeeId(current + 1);
}
