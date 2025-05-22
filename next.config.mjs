// no idea why this is .mjs, but not changing it until i need to

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {},
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding');

    return config;
  },
  productionBrowserSourceMaps: true,
  devIndicators: {
    buildActivityPosition: 'bottom-right',
    buildActivity: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};


export default nextConfig