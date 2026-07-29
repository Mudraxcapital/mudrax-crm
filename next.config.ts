import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Large Excel imports send thousands of rows through Server Actions.
    serverActions: {
      bodySizeLimit: "32mb",
    },
  },
  // Keep Node-only clients out of the Turbopack/webpack graph for
  // instrumentation and Server Actions.
  serverExternalPackages: ["redis", "@redis/client", "pg", "@prisma/adapter-pg"],
};

export default nextConfig;
