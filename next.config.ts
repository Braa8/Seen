// next.config.ts
import type { NextConfig } from "next";

// إعدادات محسنة للأداء وتقليل الحمولة
const nextConfig: NextConfig = {
  // إعدادات رؤوس HTTP
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'X-Frame-Options',
          value: 'SAMEORIGIN',
        },
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block',
        },
        // تقليل حجم الـ cookies
        {
          key: 'Set-Cookie',
          value: 'SameSite=Strict; Path=/; Secure; HttpOnly; Max-Age=86400',
        },
      ],
    },
  ],
  
  // تعطيل الملفات الثابتة غير الضرورية
  generateBuildId: async () => 'build',
  
  // إعدادات Vercel التجريبية
  
  // إعدادات الصور
  images: {
    unoptimized: true, // تعطيل تحسين الصور المدمج
    domains: [], // أضف هنا أي نطاقات للصور الخارجية
  },

  // تعطيل خريطة المصدر في الإنتاج
  productionBrowserSourceMaps: false,

  // إعدادات Webpack الأساسية مع تحسينات
  webpack: (config, { isServer, dev }) => {
    // حل مشكلة pdfjs
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "pdfjs-dist/build/pdf.worker.entry": "pdfjs-dist/legacy/build/pdf.worker.mjs",
    };

    // تحسينات الإنتاج فقط
    if (!isServer && process.env.NODE_ENV === 'production') {
      config.optimization = {
        ...config.optimization,
        minimize: true,
        splitChunks: {
          chunks: 'all',
          maxSize: 200 * 1024, // خفضنا الحجم إلى 200KB
          minSize: 20 * 1024,  // الحد الأدنى لحجم الشفرات
          cacheGroups: {
            defaultVendors: {
              test: /[\\/]node_modules[\\/]/,
              priority: -10,
              reuseExistingChunk: true,
            },
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
            },
          },
        },
        // تقليل حجم الملفات المولدة
        runtimeChunk: 'single',
        moduleIds: 'deterministic',
        chunkIds: 'deterministic',
      };
    }
    
    // تقليل حجم source maps في وضع التطوير
    if (dev) {
      config.devtool = 'cheap-module-source-map';
    }

    return config;
  },

  // تحسينات الأداء والأمان
  generateEtags: false, // تعطيل ETags لتحسين الأداء
  compress: true,       // تفعيل ضغط GZIP
  poweredByHeader: false, // إخفاء معلومات Next.js
  reactStrictMode: true,
  swcMinify: true,     // استخدام SWC للتصغير
  
  // إعدادات التصدير والتصدير الجزئي
  output: 'standalone',
  trailingSlash: false,
  
  // إعدادات إضافية للأداء
  staticPageGenerationTimeout: 1000,
  skipTrailingSlashRedirect: true,
  skipMiddlewareUrlNormalize: true,
  skipInterceptionRewrites: true,
  
  // إعدادات Vercel التجريبية
  experimental: {
    // تمكين ميزات Vercel
    serverComponentsExternalPackages: ['@vercel/analytics'],
    
    // تحسينات الأداء
    optimizeCss: false, // تم التعطيل لتجنب مشكلة critters
    scrollRestoration: true,
    workerThreads: false,
    optimizePackageImports: ['react-icons', 'lodash'],
    largePageDataBytes: 256 * 1000, // 256KB
    // تم إزالة الخصائص غير المدعومة
  },
};

export default nextConfig;