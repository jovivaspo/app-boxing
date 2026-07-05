import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Dev server blocks cross-origin asset/HMR requests by default; allow
  // the ZeroTier host so the dev container is reachable from other devices.
  allowedDevOrigins: ["10.142.199.225", "10.142.199.225.nip.io"],
};

export default nextConfig;
