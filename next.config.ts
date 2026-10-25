import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Pin the root to this folder. Otherwise a stray package-lock.json in a
    // parent folder (e.g. the home directory) makes Next.js pick that folder
    // as the workspace root, which breaks module resolution in dev.
    root: path.join(__dirname),
  },
};

export default nextConfig;
