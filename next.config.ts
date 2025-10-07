import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "pdfjs-dist/build/pdf.worker.entry": "pdfjs-dist/legacy/build/pdf.worker.mjs",
    };

    return config;
  },
};

export default nextConfig;
