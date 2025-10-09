import type { NextConfig } from 'next'

import withBundleAnalyzer from '@next/bundle-analyzer'

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-dialog',
      '@radix-ui/react-context-menu',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-label',
      '@radix-ui/react-slot',
      'lucide-react',
      '@tanstack/react-query',
      '@tiptap/react',
      '@tiptap/core',
    ],
    optimizeCss: true,
  },

  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? {
          exclude: ['error', 'warn'],
        }
      : false,
  },

  // webpack: (config, { dev }) => {
  //   if (!dev) {
  //     config.optimization = {
  //       ...config.optimization,
  //       splitChunks: {
  //         ...config.optimization.splitChunks,
  //         chunks: 'all',
  //         cacheGroups: {
  //           ...config.optimization.splitChunks.cacheGroups,
  //           vendor: {
  //             test: /[\\/]node_modules[\\/]/,
  //             name: 'vendors',
  //             chunks: 'initial',
  //             priority: 10,
  //             enforce: true,
  //           },
  //           framework: {
  //             chunks: 'all',
  //             name: 'framework',
  //             test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
  //             priority: 40,
  //             enforce: true,
  //           },
  //           ui: {
  //             test: /[\\/]node_modules[\\/](@radix-ui|lucide-react)[\\/]/,
  //             name: 'ui-lib',
  //             chunks: 'all',
  //             priority: 30,
  //             enforce: true,
  //           },
  //           common: {
  //             name: 'common',
  //             minChunks: 2,
  //             chunks: 'async',
  //             priority: 20,
  //             reuseExistingChunk: true,
  //           },
  //         },
  //       },
  //     }
  //   }
  //   return config
  // },

  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
        pathname: '/**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  compress: true,

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // {
          //   key: 'Cross-Origin-Embedder-Policy',
          //   value: 'require-corp',
          // },
          // {
          //   key: 'Cross-Origin-Opener-Policy',
          //   value: 'same-origin',
          // },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, s-maxage=300',
          },
        ],
      },
    ]
  },

  webpack: (config) => {
    // Support for WASM
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    }

    config.output.webassemblyModuleFilename = 'static/wasm/[modulehash].wasm'

    return config
  },
}

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

export default bundleAnalyzer(nextConfig)
