/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // output: 'export',          // Enables static export
  basePath: '/law',          // <-- Subfolder path
  assetPrefix: '/law/',      // <-- Ensures assets load correctly

  trailingSlash: true,       // Avoids 404 issues on Hostinger
  images: {
    unoptimized: true,       // Needed for static export if using next/image
  },
};

module.exports = nextConfig;
