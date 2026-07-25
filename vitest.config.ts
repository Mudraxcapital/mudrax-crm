import { defineConfig } from "vitest/config";
import path from "node:path";

// Minimal Vitest config: this project's tests target the framework-free
// domain/application layers (Clean Architecture — ADR 0001), so no jsdom/DOM
// environment or React plugin is required. Integration tests that need the
// real Postgres instance are tagged in their own file and skipped
// automatically when DATABASE_URL is not set (see
// each *.integration.test.ts file's own guard).
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "prisma/**/*.test.ts"],
    // *.integration.test.ts files share one real Postgres instance and,
    // within it, one *global* (not per-Organization/per-aggregate) hash
    // chain per audit log table (each INSERT's previousRecordHash is
    // "whatever the single most-recently-inserted row in the whole table
    // was" — see migration 20260724184500's trigger). Running test files in
    // parallel would let unrelated suites' audit inserts interleave and
    // break each suite's own "my update chains to my own create" assertion,
    // so every file runs sequentially instead.
    fileParallelism: false,
  },
});
