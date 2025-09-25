/** @type {import('next').NextConfig} */
const profile = (process.env.BUILD_PROFILE || 'preview').toLowerCase();

const isPreview = profile !== 'prod';

const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: isPreview, // strict in prod
  },
  eslint: {
    ignoreDuringBuilds: isPreview, // strict in prod
  },
  experimental: {},
  headers: async () => {
    return [];
  },
};

module.exports = nextConfig;
