// ============================================================================
// Server-safe FormData → lead fieldValues helper.
// Kept outside "use client" modules so Server Actions can import it.
// ============================================================================

/** Extract field_* FormData entries into an internalKey map. */
export function extractFieldValuesFromFormData(
  formData: FormData,
): Record<string, string | string[]> {
  const values: Record<string, string | string[]> = {};
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("field_") || typeof value !== "string") continue;
    const internalKey = key.slice("field_".length);
    const existing = values[internalKey];
    if (existing === undefined) {
      values[internalKey] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      values[internalKey] = [existing, value];
    }
  }
  return values;
}
