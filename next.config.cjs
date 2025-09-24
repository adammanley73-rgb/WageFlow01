@'
const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias['@components'] = path.resolve(__dirname, 'components');
    config.resolve.alias['@lib'] = path.resolve(__dirname, 'lib');
    config.resolve.alias['@app'] = path.resolve(__dirname, 'app');
    return config;
  }
};

module.exports = nextConfig;
'@ | Set-Content -Encoding utf8 next.config.cjs

git add next.config.cjs
git commit -m "build: add webpack aliases for @components, @lib, @app"
git push
