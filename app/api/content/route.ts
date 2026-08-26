import { NextResponse } from "next/server";

import { getSiteContent } from "@/lib/content";

export const runtime = "nodejs";

/**
 * Read-only, headless view of everything the homepage renders. Useful for a
 * future second front-end, a native app, or automated checks. Published content
 * only — nothing here is private.
 */
export async function GET() {
  const content = await getSiteContent();

  return NextResponse.json(
    {
      settings: content.settings,
      sections: content.sections,
      videos: content.videos,
      social: content.social,
      photos: content.photos,
      logos: content.logos,
      testimonials: content.testimonials,
      posts: content.posts,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
