/** Canonical default Lead Source catalog name for new leads and imports. */
export const DEFAULT_LEAD_SOURCE_NAME = "Data";

export function pickDefaultLeadSource<
  T extends { id: string; name: string; isActive?: boolean },
>(sources: T[]): T | undefined {
  const active = sources.filter((source) => source.isActive !== false);
  const pool = active.length > 0 ? active : sources;
  const wanted = DEFAULT_LEAD_SOURCE_NAME.toLowerCase();
  return (
    pool.find((source) => source.name.trim().toLowerCase() === wanted) ?? pool[0]
  );
}
