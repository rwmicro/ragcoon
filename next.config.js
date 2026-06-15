/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },

  // Optimize for production
  compress: true,
  poweredByHeader: false,

  // Logging
  logging: {
    fetches: {
      fullUrl: false,
    },
  },

  // Auto-memoize components/hooks at build time (React 19 + React Compiler),
  // removing the need for most manual useMemo/useCallback/React.memo.
  reactCompiler: true,

  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    // Tree-shake barrel exports of large icon / UI packages so only the
    // components actually used are bundled.
    optimizePackageImports: [
      'lucide-react',
      'react-icons',
      '@phosphor-icons/react',
    ],
  },
}

// Wrap with the bundle analyzer; run `ANALYZE=true npm run build` to inspect
// the client/server bundles.
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer(nextConfig)
