import { get } from "@vercel/blob";
import { NextResponse } from "next/server";

import { blobPathnameFor } from "@/lib/blob-proxy";

export const runtime = "nodejs";

/**
 * Serves an object out of the private Blob store.
 *
 * The store this project uses is private: fetching one of its URLs directly
 * returns 403. Thumbnails, gallery photos and logos have to be readable by
 * ordinary visitors, so they come through here — read with the store token,
 * streamed back to the browser.
 *
 * Deliberately unauthenticated. These are the images on the public site; a
 * session check would mean visitors saw broken pictures. What keeps that from
 * being a hole is the prefix: `blobPathnameFor` can only ever produce a
 * pathname inside `media/`, so nothing else in the store is addressable here
 * however the URL is crafted.
 *
 * Cached hard on purpose. Uploads carry a random suffix, so a pathname always
 * refers to the same bytes — which makes the response immutable and lets the
 * CDN answer repeat views without invoking this function again.
 */

const CACHE_FOREVER = "public, max-age=31536000, s-maxage=31536000, immutable";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;

  const pathname = blobPathnameFor(path ?? []);
  if (!pathname) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    // Without the token nothing can be read; say so rather than 500ing.
    return new NextResponse("Media store not configured", { status: 501 });
  }

  try {
    const result = await get(pathname, { access: "private" });
    if (!result) return new NextResponse("Not found", { status: 404 });

    return new NextResponse(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType || "application/octet-stream",
        "Content-Length": String(result.blob.size),
        "Cache-Control": CACHE_FOREVER,
        // The store holds whatever an editor uploaded, so never let a browser
        // second-guess the declared type.
        "X-Content-Type-Options": "nosniff",
        // An uploaded SVG can carry script; make sure it is only ever a picture.
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      },
    });
  } catch {
    // A missing object throws rather than resolving null in some SDK versions.
    return new NextResponse("Not found", { status: 404 });
  }
}
