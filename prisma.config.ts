import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

// Multi-file schema: `schema.prisma` (generator + datasource) lives directly
// inside `prisma/`, alongside `prisma/models/*.prisma` (currently empty) and
// `prisma/migrations/`. See prisma/models/README.md for the convention.
export default defineConfig({
  schema: path.join("prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
  },
  datasource: {
    // Read directly from process.env (not the throwing `env()` helper) so
    // commands like `prisma generate` don't hard-fail before `.env` exists.
    url: process.env.DATABASE_URL,
  },
});
