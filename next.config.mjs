// next.config.mjs
import path from 'path';
import { fileURLToPath } from 'url';

/** Resolve ESM dirname safely */
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Make "@/..." resolve to the repo root (where this file lives)
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': __dirname,
    };
    return config;
  },

  // keep builds simple on Vercel (you already have TS files)
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
