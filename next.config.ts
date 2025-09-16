import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Оптимизация для production
  experimental: {
    // Включаем оптимизированные компонентные бандлы
    optimizePackageImports: [
      '@radix-ui/react-dialog',
      '@radix-ui/react-context-menu',
      '@radix-ui/react-tooltip',
      'lucide-react'
    ],
  },

  // Настройка webpack для лучшего code splitting
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks.cacheGroups,
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'initial',
              priority: 10,
            },
          },
        },
      }
    }
    return config
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
        pathname: '/**',
      },
    ],
  }
};

export default nextConfig;
