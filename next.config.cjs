/* next.config.cjs */
const isPreview = process.env.BUILD_PROFILE === "preview";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: !!isPreview },
  eslint: { ignoreDuringBuilds: !!isPreview },
  poweredByHeader: false,

  webpack: (config) => {
    // Never resolve anything from any backup_preview folder
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      backup_preview: false,
      "scripts/backup_preview": false
    };
    return config;
  }
};

module.exports = nextConfig;
