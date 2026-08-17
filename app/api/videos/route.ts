import { NextResponse } from "next/server";

import { getVideos, thumbnailFor } from "@/lib/content";

export const runtime = "nodejs";

/**
 * GET /api/videos?orientation=vertical&featured=1
 * Published videos only, in the order set in the admin.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const orientation = url.searchParams.get("orientation");
  const featuredOnly = ["1", "true"].includes(url.searchParams.get("featured") ?? "");

  let videos = await getVideos();
  if (orientation) videos = videos.filter((video) => video.orientation === orientation);
  if (featuredOnly) videos = videos.filter((video) => video.featured);

  return NextResponse.json(
    {
      count: videos.length,
      videos: videos.map((video) => ({
        ...video,
        thumbnail: thumbnailFor(video),
        watchUrl: `https://www.youtube.com/watch?v=${video.youtubeId}`,
      })),
    },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
  );
}
