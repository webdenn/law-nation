import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // output: 'export',          // Enables static export
  poweredByHeader: false,
  trailingSlash: true,       // Avoids 404 issues on Hostinger
  images: {
    unoptimized: true,
  },
  turbopack: {},
  output: "standalone",
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
