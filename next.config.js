/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',

  // Optimize for production
  compress: true,
  poweredByHeader: false,

  // Logging
  logging: {
    fetches: {
      fullUrl: false,
    },
  },

  // Experimental features
  experimental: {
    // Enable server actions if needed
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
}

module.exports = nextConfig