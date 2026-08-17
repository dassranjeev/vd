import type { Metadata, Viewport } from "next";

import { getSettings, siteOrigin } from "@/lib/content";

import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
};

/**
 * Metadata is generated from the SEO settings group, so the whole social/search
 * surface is editable from /admin/settings without a redeploy.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { seo, site } = await getSettings();
  const origin = siteOrigin(seo.canonicalUrl);

  return {
    metadataBase: new URL(origin),
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords
      .split(",")
      .map((keyword) => keyword.trim())
      .filter(Boolean),
    authors: [{ name: site.siteName }],
    alternates: { canonical: "/" },
    robots: seo.indexable
      ? { index: true, follow: true }
      : { index: false, follow: false, nocache: true },
    openGraph: {
      type: "website",
      url: origin,
      siteName: `${site.siteName} Portfolio`,
      title: seo.ogTitle || seo.title,
      description: seo.ogDescription || seo.description,
      locale: "en_CA",
      images: seo.ogImage ? [{ url: seo.ogImage, width: 1200, height: 630 }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: seo.ogTitle || seo.title,
      description: seo.ogDescription || seo.description,
      images: seo.ogImage ? [seo.ogImage] : undefined,
    },
    icons: { icon: "/favicon.svg" },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Syne:wght@400;500;600;700;800&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
