import type { NextConfig } from "next"
import bundleAnalyzer from "@next/bundle-analyzer"

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
})

const nextConfig: NextConfig = withBundleAnalyzer({
  output: "standalone",
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react"],
    // Reduce memory usage in dev
    webpackMemoryOptimizations: true,
  },
  serverExternalPackages: ["shiki", "vscode-oniguruma"],
  webpack: (config: any, { isServer, dev }: any) => {
    // Memory optimizations for development
    if (dev) {
      config.cache = false
      config.optimization = {
        ...config.optimization,
        moduleIds: 'named',
        chunkIds: 'named',
      }
    }

    // Externalize node-specific modules for client-side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        util: false,
        url: false,
        querystring: false,
      }
      
      // Exclude problematic packages from client bundle
      config.externals = config.externals || []
      config.externals.push({
        'pdf-parse': 'pdf-parse'
      })
    }
    
    return config
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  eslint: {
    // @todo: remove before going live
    ignoreDuringBuilds: true,
  },
})

export default nextConfig
