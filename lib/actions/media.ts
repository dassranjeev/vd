"use server";

import { eq } from "drizzle-orm";

import { recordActivity } from "@/lib/activity";
import { requireSession } from "@/lib/auth";
import { revalidateContent } from "@/lib/cache";
import { getDb, media } from "@/lib/db";

import { attempt, fail, readString, succeed, type ActionState } from "./types";

/** True when a Vercel Blob store is wired up and uploads can be accepted. */
export async function isBlobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/**
 * Register an asset that already lives somewhere else — a file committed to
 * /public, or a URL from another CDN. Keeps the Media Library useful even
 * without a Blob store.
 */
export async function addExternalMediaAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return attempt(async () => {
    const session = await requireSession();
    const url = readString(form, "url");
    const alt = readString(form, "alt");

    if (!url) return fail("Paste a URL or a /public path.", { url: "A URL is required." });
    if (!url.startsWith("/") && !/^https?:\/\//.test(url)) {
      return fail("Use an absolute URL or a path starting with /.", {
        url: "Must start with / or http(s)://",
      });
    }

    const filename = url.split("/").pop() || url;
    await getDb()
      .insert(media)
      .values({ url, filename, alt, source: "external", uploadedBy: session.sub });

    await recordActivity(session, { action: "created", entity: "media", summary: filename });
    return succeed(`Added ${filename} to the library.`);
  });
}

export async function updateMediaAltAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return attempt(async () => {
    await requireSession();
    const id = readString(form, "id");
    if (!id) return fail("Missing media ID.");

    await getDb().update(media).set({ alt: readString(form, "alt") }).where(eq(media.id, id));
    revalidateContent();
    return succeed("Description saved.");
  });
}

export async function deleteMediaAction(form: FormData) {
  const session = await requireSession();
  const id = readString(form, "id");
  if (!id) return;

  const db = getDb();
  const [removed] = await db
    .delete(media)
    .where(eq(media.id, id))
    .returning({ pathname: media.pathname, filename: media.filename, source: media.source, url: media.url });

  // Best-effort cleanup of the underlying blob; the row is already gone.
  if (removed?.source === "blob" && process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { del } = await import("@vercel/blob");
      await del(removed.url);
    } catch {
      // The library entry is removed either way.
    }
  }

  await recordActivity(session, {
    action: "deleted",
    entity: "media",
    entityId: id,
    summary: removed?.filename ?? id,
  });
}

/**
 * Records a blob that the browser uploaded directly.
 *
 * With client uploads the file never passes through a server route, so nothing
 * server-side knows it happened. Vercel can call an onUploadCompleted webhook,
 * but that never reaches localhost, so the client calls this once upload()
 * resolves. Re-checks auth, and ignores anything not actually in our store.
 */
export async function recordUploadedMediaAction(input: {
  url: string;
  pathname: string;
  filename: string;
  contentType: string;
  size: number;
}): Promise<ActionState> {
  return attempt(async () => {
    const session = await requireSession();

    if (!/^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i.test(input.url)) {
      return fail("That does not look like a Blob URL.");
    }

    await getDb().insert(media).values({
      url: input.url,
      pathname: input.pathname.slice(0, 500),
      filename: input.filename.slice(0, 300),
      contentType: input.contentType.slice(0, 120),
      size: Number.isFinite(input.size) ? Math.max(0, Math.round(input.size)) : 0,
      source: "blob",
      uploadedBy: session.sub,
    });

    await recordActivity(session, {
      action: "created",
      entity: "media",
      summary: input.filename,
    });
    return succeed("Uploaded.");
  });
}
