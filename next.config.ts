import type { NextConfig } from "next";

const repoDir = "Field-Test-Operations-Dashboard.";
const usingPages = process.env.GITHUB_PAGES === "1";
const basePath = usingPages ? `/${repoDir}` : "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  basePath,
  allowedDevOrigins: ["127.0.0.1"],
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
