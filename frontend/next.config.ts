import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // output: 'export',          // Enables static export
  basePath: '/law',          // <-- Subfolder path
<<<<<<< Updated upstream
  assetPrefix: '/law/',      // <-- Ensures assets load correctly

  trailingSlash: true,
  output: "standalone",     // Avoids 404 issues on Hostinger
=======
  trailingSlash: true,       // Avoids 404 issues on Hostinger
>>>>>>> Stashed changes
  images: {
    unoptimized: true,       // Needed for static export if using next/image
  },

  // ✅ Empty turbopack config to silence the warning
  turbopack: {},
  output:"standalone",
};

export default nextConfig;
