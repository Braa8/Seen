// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // تعطيل تحسين الصور المدمج
  images: {
    unoptimized: true,
  },

  // تعطيل خريطة المصدر في الإنتاج
  productionBrowserSourceMaps: false,

  // إعدادات Webpack
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "pdfjs-dist/build/pdf.worker.entry": "pdfjs-dist/legacy/build/pdf.worker.mjs",
    };

    // تحسين حجم الحزمة
    if (process.env.NODE_ENV === 'production') {
      config.optimization.minimize = true;
      config.optimization.splitChunks = {
        chunks: 'all',
        maxSize: 244 * 1024, // 244KB
      };
    }

    return config;
  },

  // تعطيل ETag
  generateEtags: false,

  // ضغط Gzip
  compress: true,

  // إعدادات إضافية
  poweredByHeader: false,
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  staticPageGenerationTimeout: 1000,
  trailingSlash: false,
  skipTrailingSlashRedirect: true,
  skipMiddlewareUrlNormalize: true,
  skipInterceptionRewrites: true,
  
  // إعدادات الأداء
  experimental: {
    largePageDataBytes: 512 * 1000, // 512KB
    optimizeCss: false, // Disabled to avoid critters dependency
    scrollRestoration: true,
    optimizePackageImports: ['react-icons', 'lodash'],
    // Removed serverComponentsExternalPackages to avoid potential build issues
    workerThreads: false,
  },
};

export default nextConfig;