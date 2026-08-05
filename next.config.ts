import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Large Excel imports send thousands of rows through Server Actions.
    serverActions: {
      bodySizeLimit: "32mb",
    },
  },
  // Local/prod canonical hostname (hosts file or company DNS → this app).
  // Prevents Next.js from blocking Server Actions / HMR from non-localhost.
  allowedDevOrigins: ["mudrax.crm", "staging.mudrax.crm"],
  // Keep Node-only clients out of the Turbopack/webpack graph for
  // instrumentation and Server Actions.
  serverExternalPackages: ["redis", "@redis/client", "pg", "@prisma/adapter-pg"],
  // Tree-shake heavy client packages that are imported from many screens.
  optimizePackageImports: ["recharts", "xlsx"],
};

export default nextConfig;
