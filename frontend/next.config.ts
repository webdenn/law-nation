import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // output: 'export',          // Enables static export
  basePath: '/law',          // <-- Subfolder path
  trailingSlash: true,       // Avoids 404 issues on Hostinger
  images: {
    unoptimized: true,       // Needed for static export if using next/image
  },

  // ✅ Empty turbopack config to silence the warning
  turbopack: {},
  output:"standalone",
};

export default nextConfig;
