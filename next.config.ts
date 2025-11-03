import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // إضافة إعدادات الرؤوس
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'x-vercel-buffer-request',
            value: 'true'
          }
        ]
      }
    ]
  },
  // الإعدادات الحالية
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "pdfjs-dist/build/pdf.worker.entry": "pdfjs-dist/legacy/build/pdf.worker.mjs",
    };
    return config;
  },
  // إضافة إعدادات إضافية
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  // زيادة حجم الرؤوس المسموح به
  experimental: {
    largePageDataBytes: 256 * 1000, // 256KB
  },
};

export default nextConfig;