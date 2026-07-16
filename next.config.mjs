// next.config.mjs
import createNextIntlPlugin from 'next-intl/plugin';
import nextra from 'nextra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const withNextIntl = createNextIntlPlugin();
const withNextra = nextra({
  contentDirBasePath: '/admin/help',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.shopify.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.mornsun.cn',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'sc04.alicdn.com',
        port: '',
        pathname: '/**',
      },
    ],
    localPatterns: [
      {
        pathname: '/api/proxy-image/**',
        search: '',
      },
      {
        pathname: '/uploads/**',
        search: '',
      },
    ],
  },

  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': path.resolve(__dirname),
    };
    return config;
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  // ✅ 添加此配置，确保 Next.js 不会干扰中间件的路径匹配
  skipMiddlewareUrlNormalize: true,
};

export default withNextIntl(withNextra(nextConfig));