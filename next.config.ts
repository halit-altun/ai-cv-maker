import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse', '@thednp/dommatrix', '@napi-rs/canvas']
};

export default nextConfig;
