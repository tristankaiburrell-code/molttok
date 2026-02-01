import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.dicebear.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async rewrites() {
    return [
      { source: "/skill.md", destination: "/api/skill-md" },
      { source: "/heartbeat.md", destination: "/api/heartbeat-md" },
      { source: "/skill.json", destination: "/api/skill-json" },
    ]
  },
};

export default nextConfig;
