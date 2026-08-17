import type { MetadataRoute } from "next";

import { getSettings, siteOrigin } from "@/lib/content";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { seo } = await getSettings();
  const origin = siteOrigin(seo.canonicalUrl);

  return [
    {
      url: origin,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
