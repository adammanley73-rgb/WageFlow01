// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  trailingSlash: false,
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "thebusinessconsortiumltd.co.uk" }],
        destination: "https://www.thebusinessconsortiumltd.co.uk/:path*",
        permanent: true,
      },
      {
        source: "/preview/tbc",
        destination: "/",
        permanent: true,
      },
      {
        source: "/preview/tbc/:path*",
        destination: "/",
        permanent: true,
      },
      {
        source: "/preview/wageflow-v2",
        has: [{ type: "host", value: "www.thebusinessconsortiumltd.co.uk" }],
        destination: "/wageflow",
        permanent: true,
      },
      {
        source: "/preview/wageflow-v2/:path*",
        has: [{ type: "host", value: "www.thebusinessconsortiumltd.co.uk" }],
        destination: "/wageflow",
        permanent: true,
      },
      {
        source: "/preview/wageflow-v2",
        has: [{ type: "host", value: "wageflow.thebusinessconsortiumltd.co.uk" }],
        destination: "/",
        permanent: true,
      },
      {
        source: "/preview/wageflow-v2/:path*",
        has: [{ type: "host", value: "wageflow.thebusinessconsortiumltd.co.uk" }],
        destination: "/",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [];
  },
};
module.exports = nextConfig;
