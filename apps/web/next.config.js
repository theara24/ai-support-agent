/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // Keep the native Prisma query engine out of the webpack bundle so it is
    // required from node_modules at runtime instead of being inlined.
    serverComponentsExternalPackages: ['@prisma/client', '.prisma/client'],
  },
};

module.exports = nextConfig;
