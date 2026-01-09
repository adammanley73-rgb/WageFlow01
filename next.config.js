// C:\Users\adamm\Projects\wageflow01\next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  trailingSlash: false,

  async redirects() {
    return [
      // Hide company preview route if someone stumbles on it
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

      // Hide WageFlow marketing preview route
      // Company hosts -> send to the real marketing page
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

      // WageFlow subdomain -> send to the demo app root
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
