import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Video cards use plain <img> so the YouTube thumbnail fallback chain works;
  // these patterns are here for any next/image use added later.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
};

export default nextConfig;
