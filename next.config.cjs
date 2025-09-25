// File: next.config.cjs

/** @type {import('next').NextConfig} */
const isPreview = process.env.BUILD_PROFILE === "preview";

module.exports = {
  reactStrictMode: true,

  // Only relax lint/TS for preview builds
  eslint: { ignoreDuringBuilds: isPreview },
  typescript: { ignoreBuildErrors: isPreview },

  // Keep webpack simple for preview; aliases handled via ts/jsconfig
  webpack: (config) => {
    return config;
  },
};
