import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  /* reactCompiler disabled — it breaks TipTap useEditor lifecycle on re-mount */
  /*bypass typescript and eslint */
  typescript: {
    // This will ignore TypeScript errors during build
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
