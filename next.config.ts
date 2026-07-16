import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: "/payment/success.html", destination: "/payment/success", permanent: false },
      { source: "/payment/cancel.html", destination: "/payment/cancel", permanent: false },
      { source: "/payment/failure.html", destination: "/payment/failure", permanent: false },
    ];
  },
};

export default nextConfig;
