/** True for canonical UUID strings (internal primary keys). */
export function looksLikeUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

/**
 * Prefer a human-readable name. Never surface a raw UUID as the primary label.
 * Non-UUID codes (e.g. employee numbers) are allowed only when no name exists.
 */
export function resolveDisplayName(
  name: string | null | undefined,
  idFallback?: string | null,
  unknownLabel = "Unknown",
): string {
  const trimmed = name?.trim();
  if (trimmed) return trimmed;
  const id = idFallback?.trim();
  if (id && !looksLikeUuid(id)) return id;
  return unknownLabel;
}

/** Look up a display name from an id→name map without leaking UUIDs. */
export function nameFromMap(
  map: Map<string, string>,
  id: string | null | undefined,
  unknownLabel = "Unknown",
): string {
  if (!id) return unknownLabel;
  return resolveDisplayName(map.get(id), id, unknownLabel);
}
