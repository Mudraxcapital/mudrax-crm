// ============================================================================
// src/shared/search/fuzzy.ts
//
// Lightweight fuzzy matcher used by Global Search / Advanced Search.
// Framework-free; no third-party dependency.
// ============================================================================

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Dice coefficient over character bigrams — good for short CRM strings. */
export function fuzzyScore(query: string, candidate: string): number {
  const q = normalize(query);
  const c = normalize(candidate);
  if (!q || !c) return 0;
  if (c.includes(q)) return Math.min(1, 0.85 + q.length / Math.max(c.length, 1) / 5);
  if (q.length < 2) return c.startsWith(q) ? 0.5 : 0;

  const bigrams = (text: string): Map<string, number> => {
    const map = new Map<string, number>();
    for (let i = 0; i < text.length - 1; i++) {
      const gram = text.slice(i, i + 2);
      map.set(gram, (map.get(gram) ?? 0) + 1);
    }
    return map;
  };

  const a = bigrams(q);
  const b = bigrams(c);
  let overlap = 0;
  for (const [gram, count] of a) {
    overlap += Math.min(count, b.get(gram) ?? 0);
  }
  const total = q.length + c.length - 2;
  if (total <= 0) return 0;
  return (2 * overlap) / total;
}

export function rankByFuzzy<T>(
  query: string,
  items: T[],
  getText: (item: T) => string | null | undefined,
  minScore = 0.25,
): Array<{ item: T; score: number }> {
  const ranked: Array<{ item: T; score: number }> = [];
  for (const item of items) {
    const text = getText(item);
    if (!text) continue;
    const score = fuzzyScore(query, text);
    if (score >= minScore) ranked.push({ item, score });
  }
  ranked.sort((a, b) => b.score - a.score);
  return ranked;
}
