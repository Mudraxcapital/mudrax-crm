export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function truncate(value: string, maxLength: number): string {
  if (maxLength < 1) return "";
  if (value.length <= maxLength) return value;
  if (maxLength === 1) return "…";
  return `${value.slice(0, maxLength - 1)}…`;
}
