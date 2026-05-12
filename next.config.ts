import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "assets.land.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "ssl.cdn-redfin.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.public.blob.vercel-storage.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "maps.googleapis.com",
        pathname: "/maps/api/**",
      },
    ],
  },
};

export default nextConfig;
