import type { NextConfig } from "next";

/**
 * Transport security.
 *
 * Vercel already terminates TLS, renews certificates, and redirects HTTP to
 * HTTPS on every deployment and custom domain — there is no certificate work to
 * do here. What Vercel does *not* set for you is HSTS, which is what actually
 * stops a first, pre-redirect plaintext request from being intercepted. That,
 * plus the usual hardening headers, is what this block adds.
 *
 * `includeSubDomains` commits every subdomain of your domain to HTTPS for the
 * max-age. That is correct while everything is Vercel-hosted; if you ever point
 * a subdomain at a host without a valid certificate, remove it or that subdomain
 * will become unreachable in browsers that have seen this header.
 *
 * `preload` is deliberately omitted: getting onto the browser preload list is
 * slow to reverse and easy to regret.
 */
const SECURITY_HEADERS = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  // Stop browsers second-guessing declared content types.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Send the origin cross-site, the full path same-origin.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // This site is never meant to be embedded elsewhere.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Nothing here needs these capabilities.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  // Clickjacking cover for browsers that prefer CSP over X-Frame-Options.
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
];

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

  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      {
        // Belt-and-braces with robots.txt: never let the admin or the API be
        // indexed, and never let a proxy cache an authenticated response.
        source: "/admin/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "no-store, must-revalidate" },
        ],
      },
      {
        source: "/api/admin/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
