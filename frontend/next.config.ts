import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // output: 'export',          // Enables static export
  basePath: '/law',          // <-- Subfolder path
  assetPrefix: '/law/',      // <-- Ensures assets load correctly

  trailingSlash: true,
  output: "standalone",     // Avoids 404 issues on Hostinger
  images: {
    unoptimized: true,       // Needed for static export if using next/image
  },

  // ✅ Empty turbopack config to silence the warning
  turbopack: {},
};

export default nextConfig;
