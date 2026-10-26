import type { NextConfig } from "next";

const repoDir = "Field-Test-Operations-Dashboard.";
const usingPages = process.env.GITHUB_PAGES === "1";
const basePath = usingPages ? `/${repoDir}` : "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: ["pdfjs-dist"],
  basePath,
  allowedDevOrigins: ["127.0.0.1"],
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  turbopack: {
    resolveAlias: {
      "pdfjs-dist": "pdfjs-dist/build/pdf.mjs",
    },
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

if (process.env.NODE_ENV !== "production") {
  nextConfig.rewrites = async () => [
    { source: "/api/sim-local/:path*", destination: "http://127.0.0.1:43147/api/:path*" },
  ];
}

export default nextConfig;
