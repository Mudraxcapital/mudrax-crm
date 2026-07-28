/** Convert audit action codes (e.g. LeadCreated) into human-readable activity text. */
export function humanizeAuditAction(action: string): string {
  const spaced = action
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  if (!spaced) return action;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
