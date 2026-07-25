import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Large Excel imports send thousands of rows through Server Actions.
    serverActions: {
      bodySizeLimit: "32mb",
    },
  },
};

export default nextConfig;
