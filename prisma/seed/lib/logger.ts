// ============================================================================
// prisma/seed/lib/logger.ts
//
// Tiny console-output helpers so every seed step explains *what* it is
// creating and *why* (in terms of the accepted docs/ADRs it traces back to)
// as it runs, satisfying "explain every generated seed" without every step
// file re-inventing its own formatting.
// ============================================================================

export function section(title: string): void {
  console.log(`\n${"-".repeat(78)}`);
  console.log(title);
  console.log("-".repeat(78));
}

/** One human-readable rationale line, printed as the step does the work. */
export function explain(text: string): void {
  console.log(`  · ${text}`);
}

/** One "N rows of this kind were seeded" line, printed at the end of a step. */
export function summary(label: string, count: number): void {
  console.log(`  \u2714 ${label}: ${count}`);
}
