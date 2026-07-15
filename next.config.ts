import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A stray lockfile in the home directory makes Next infer the wrong
  // workspace root; pin it so builds resolve deps from this repo.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
