import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Ensure Next picks this project directory as the workspace root
    // even if there are other lockfiles higher up.
    root: process.cwd(),
  },
};

export default nextConfig;
