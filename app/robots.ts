import type { MetadataRoute } from "next";

import { getSettings, siteOrigin } from "@/lib/content";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const { seo } = await getSettings();
  const origin = siteOrigin(seo.canonicalUrl);

  return {
    rules: seo.indexable
      ? { userAgent: "*", allow: "/", disallow: ["/admin", "/api"] }
      : { userAgent: "*", disallow: "/" },
    sitemap: `${origin}/sitemap.xml`,
  };
}
