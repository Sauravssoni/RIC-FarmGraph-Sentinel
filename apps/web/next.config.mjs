/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
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
