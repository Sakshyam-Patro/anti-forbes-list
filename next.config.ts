import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // baseline.json + curated YAML are read from the repo at build/revalidate time
  outputFileTracingIncludes: {
    "/**": ["./data/derived/**", "./data/curated/**", "./METHODOLOGY.md"],
  },
};

export default nextConfig;
