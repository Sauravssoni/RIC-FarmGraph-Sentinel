/** @type {import('next').NextConfig} */
// NEXT_PUBLIC_BASE_PATH is set by the GitHub Pages workflow (project sites
// serve under /<repo>). Local and docker builds leave it empty.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
  transpilePackages: ["@fgr/contracts"],
  experimental: { externalDir: true },
  eslint: { dirs: ["src", "tests"] },
  webpack: (config) => {
    // Licensed Natural Earth outline ships as .geojson — load it as JSON data.
    config.module.rules.push({ test: /\.geojson$/, type: "json" });
    return config;
  },
};

export default nextConfig;
