import { NextResponse } from "next/server";

import { recordActivity } from "@/lib/activity";
import { getSession } from "@/lib/auth";
import { getDb, media } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 100 * 1024 * 1024; // 100 MB — enough for a hero reel.
const ALLOWED_PREFIXES = ["image/", "video/"];

/**
 * Uploads a file to Vercel Blob and records it in the Media Library.
 * Multipart bodies need a route handler, so this sits outside the server
 * actions the rest of the admin uses.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "No Blob store connected. Create one in the Vercel dashboard (Storage → Blob), or add the asset by URL instead.",
      },
      { status: 501 },
    );
  }

  let file: File | null = null;
  try {
    const form = await request.formData();
    const candidate = form.get("file");
    if (candidate instanceof File) file = candidate;
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed upload." }, { status: 400 });
  }

  if (!file || file.size === 0) {
    return NextResponse.json({ ok: false, error: "Choose a file to upload." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "That file is larger than 100 MB." }, { status: 413 });
  }
  if (!ALLOWED_PREFIXES.some((prefix) => file!.type.startsWith(prefix))) {
    return NextResponse.json(
      { ok: false, error: "Only image and video files can be uploaded." },
      { status: 415 },
    );
  }

  try {
    const { put } = await import("@vercel/blob");
    const blob = await put(`media/${file.name}`, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type,
    });

    const [row] = await getDb()
      .insert(media)
      .values({
        url: blob.url,
        pathname: blob.pathname,
        filename: file.name,
        contentType: file.type,
        size: file.size,
        source: "blob",
        uploadedBy: session.sub,
      })
      .returning({ id: media.id });

    await recordActivity(session, {
      action: "created",
      entity: "media",
      entityId: row.id,
      summary: file.name,
    });

    return NextResponse.json({ ok: true, url: blob.url, id: row.id, filename: file.name });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Upload failed." },
      { status: 500 },
    );
  }
}
