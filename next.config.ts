import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["10.142.199.225", "10.142.199.225.nip.io"],
};

export default nextConfig;
