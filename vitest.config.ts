import { defineConfig } from "vitest/config";
import path from "node:path";

// Minimal Vitest config: this project's tests target the framework-free
// domain/application layers (Clean Architecture — ADR 0001), so no jsdom/DOM
// environment or React plugin is required. Integration tests that need the
// real Postgres instance are tagged in their own file and skipped
// automatically when DATABASE_URL is not set (see
// src/modules/organization/__tests__/README or each *.integration.test.ts
// file's own guard).
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "prisma/**/*.test.ts"],
  },
});
