// next.config.js — disable any framework redirects/rewrites
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  trailingSlash: false,
  async redirects() { return [] },
  async rewrites() { return [] },
}
module.exports = nextConfig
