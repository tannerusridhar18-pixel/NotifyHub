import type { NextConfig } from "next";

const backend = process.env.NOTIFYHUB_BACKEND_ORIGIN || "http://localhost:8080";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${backend}/api/v1/:path*` }];
  },
};

export default nextConfig;
