type ClassValue = string | false | null | undefined | ClassValue[];

/** Lightweight className merger (no external dependency). */
export function cn(...values: ClassValue[]): string {
  const out: string[] = [];
  for (const value of values) {
    if (!value) continue;
    if (typeof value === "string") {
      out.push(value);
      continue;
    }
    if (Array.isArray(value)) {
      const nested = cn(...value);
      if (nested) out.push(nested);
    }
  }
  return out.join(" ");
}
