"use server";

import { and, asc, eq, gt, lt, max, sql as raw } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

import { recordActivity } from "@/lib/activity";
import { requireSession } from "@/lib/auth";
import { revalidateContent } from "@/lib/cache";
import { getDb, videos } from "@/lib/db";
import { extractYouTubeId, isYouTubeShortsLink } from "@/lib/utils";
import { isDerivedYouTubeThumbnail } from "@/lib/youtube";
import { resolveBestThumbnail } from "@/lib/youtube-resolve";

import { attempt, fail, readBoolean, readString, succeed, type ActionState } from "./types";

const videoInput = z.object({
  title: z.string().min(1, "A title is required.").max(200),
  youtubeId: z
    .string()
    .min(1, "A YouTube link or ID is required.")
    .regex(/^[a-zA-Z0-9_-]{11}$/, "That doesn't look like a YouTube video ID."),
  orientation: z.enum(["horizontal", "vertical"]),
  client: z.string().max(160).default(""),
  year: z.string().max(20).default(""),
  role: z.string().max(160).default(""),
  description: z.string().max(2000).default(""),
  thumbnailUrl: z.string().max(500).default(""),
  featured: z.boolean().default(false),
  published: z.boolean().default(true),
});

function parseForm(form: FormData) {
  return videoInput.safeParse({
    title: readString(form, "title"),
    youtubeId: extractYouTubeId(readString(form, "youtubeId")),
    orientation: readString(form, "orientation", "horizontal"),
    client: readString(form, "client"),
    year: readString(form, "year"),
    role: readString(form, "role"),
    description: readString(form, "description"),
    thumbnailUrl: readString(form, "thumbnailUrl"),
    featured: readBoolean(form, "featured"),
    published: readBoolean(form, "published"),
  });
}

function fieldErrorsFrom(error: z.ZodError) {
  return Object.fromEntries(
    error.issues.map((issue) => [String(issue.path[0] ?? "form"), issue.message]),
  );
}

/** Next free slot at the end of the chosen orientation's ordering. */
async function nextPosition(db: ReturnType<typeof getDb>, orientation: string) {
  const [row] = await db
    .select({ value: max(videos.position) })
    .from(videos)
    .where(eq(videos.orientation, orientation));
  return (row?.value ?? -1) + 1;
}

export async function createVideoAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const state = await attempt(async () => {
    const session = await requireSession();
    const parsed = parseForm(form);
    if (!parsed.success) {
      return fail("Please fix the highlighted fields.", fieldErrorsFrom(parsed.error));
    }

    const db = getDb();

    // No custom thumbnail: ask YouTube for the best one it actually has, so
    // the artwork is stored rather than guessed at render time.
    const thumbnailUrl =
      parsed.data.thumbnailUrl ||
      (await resolveBestThumbnail(parsed.data.youtubeId, parsed.data.orientation));

    const [created] = await db
      .insert(videos)
      .values({
        ...parsed.data,
        thumbnailUrl,
        position: await nextPosition(db, parsed.data.orientation),
      })
      .returning({ id: videos.id });

    await recordActivity(session, {
      action: "created",
      entity: "video",
      entityId: created.id,
      summary: parsed.data.title,
    });
    revalidateContent("videos");
    return succeed("Video added.");
  });

  if (!state.ok) return state;
  redirect("/admin/videos?created=1");
}

export async function updateVideoAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return attempt(async () => {
    const session = await requireSession();
    const id = readString(form, "id");
    if (!id) return fail("Missing video ID.");

    const parsed = parseForm(form);
    if (!parsed.success) {
      return fail("Please fix the highlighted fields.", fieldErrorsFrom(parsed.error));
    }

    const db = getDb();
    const [existing] = await db
      .select({ orientation: videos.orientation })
      .from(videos)
      .where(eq(videos.id, id))
      .limit(1);
    if (!existing) return fail("That video no longer exists.");

    // Moving between orientations means joining the end of the new ordering.
    const position =
      existing.orientation === parsed.data.orientation
        ? undefined
        : await nextPosition(db, parsed.data.orientation);

    // Re-resolve when there is nothing stored, or when the shape changed
    // under a URL this app derived — the best tier differs per orientation.
    const orientationChanged = existing.orientation !== parsed.data.orientation;
    const shouldResolve =
      !parsed.data.thumbnailUrl ||
      (orientationChanged && isDerivedYouTubeThumbnail(parsed.data.thumbnailUrl));

    const thumbnailUrl = shouldResolve
      ? await resolveBestThumbnail(parsed.data.youtubeId, parsed.data.orientation)
      : parsed.data.thumbnailUrl;

    await db
      .update(videos)
      .set({
        ...parsed.data,
        thumbnailUrl,
        ...(position === undefined ? {} : { position }),
        updatedAt: raw`now()`,
      })
      .where(eq(videos.id, id));

    await recordActivity(session, {
      action: "updated",
      entity: "video",
      entityId: id,
      summary: parsed.data.title,
    });
    revalidateContent("videos");
    return succeed("Changes saved.");
  });
}

export async function deleteVideoAction(form: FormData) {
  const session = await requireSession();
  const id = readString(form, "id");
  if (!id) return;

  const db = getDb();
  const [removed] = await db.delete(videos).where(eq(videos.id, id)).returning({ title: videos.title });

  await recordActivity(session, {
    action: "deleted",
    entity: "video",
    entityId: id,
    summary: removed?.title ?? id,
  });
  revalidateContent("videos");
}

export async function toggleVideoPublishedAction(form: FormData) {
  const session = await requireSession();
  const id = readString(form, "id");
  if (!id) return;

  const db = getDb();
  const [updated] = await db
    .update(videos)
    .set({ published: raw`not ${videos.published}`, updatedAt: raw`now()` })
    .where(eq(videos.id, id))
    .returning({ title: videos.title, published: videos.published });

  await recordActivity(session, {
    action: "published",
    entity: "video",
    entityId: id,
    summary: `${updated?.title ?? id} → ${updated?.published ? "published" : "hidden"}`,
  });
  revalidateContent("videos");
}

export async function toggleVideoFeaturedAction(form: FormData) {
  await requireSession();
  const id = readString(form, "id");
  if (!id) return;

  await getDb()
    .update(videos)
    .set({ featured: raw`not ${videos.featured}`, updatedAt: raw`now()` })
    .where(eq(videos.id, id));
  revalidateContent("videos");
}

/**
 * Swap a video with its neighbour inside the same orientation. Positions are
 * per-orientation, so "up" means the closest lower position in that group.
 */
export async function moveVideoAction(form: FormData) {
  const session = await requireSession();
  const id = readString(form, "id");
  const direction = readString(form, "direction") === "up" ? "up" : "down";
  if (!id) return;

  const db = getDb();
  const [current] = await db
    .select({ id: videos.id, position: videos.position, orientation: videos.orientation })
    .from(videos)
    .where(eq(videos.id, id))
    .limit(1);
  if (!current) return;

  const sameGroup = eq(videos.orientation, current.orientation);
  const [neighbour] = await db
    .select({ id: videos.id, position: videos.position })
    .from(videos)
    .where(
      direction === "up"
        ? and(sameGroup, lt(videos.position, current.position))
        : and(sameGroup, gt(videos.position, current.position)),
    )
    .orderBy(direction === "up" ? raw`${videos.position} desc` : asc(videos.position))
    .limit(1);
  if (!neighbour) return;

  await db.transaction(async (tx) => {
    await tx.update(videos).set({ position: neighbour.position }).where(eq(videos.id, current.id));
    await tx.update(videos).set({ position: current.position }).where(eq(videos.id, neighbour.id));
  });

  await recordActivity(session, {
    action: "reordered",
    entity: "video",
    entityId: id,
    summary: `moved ${direction}`,
  });
  revalidateContent("videos");
}

/**
 * Paste a batch of YouTube links (one per line, optional `| Title`) and get
 * them all queued at the end of an orientation.
 */
export async function bulkImportVideosAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return attempt(async () => {
    const session = await requireSession();
    const orientation = readString(form, "orientation", "horizontal") === "vertical" ? "vertical" : "horizontal";
    const lines = readString(form, "links")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) return fail("Paste at least one YouTube link.");

    const db = getDb();
    let position = await nextPosition(db, orientation);
    const rows: (typeof videos.$inferInsert)[] = [];
    const skipped: string[] = [];

    for (const line of lines) {
      const [linkPart, titlePart] = line.split("|").map((part) => part.trim());
      const youtubeId = extractYouTubeId(linkPart ?? "");
      if (!/^[a-zA-Z0-9_-]{11}$/.test(youtubeId)) {
        skipped.push(line);
        continue;
      }
      // A Short is vertical whatever the dropdown says, so a mixed paste
      // still lands in the right bands.
      const rowOrientation = isYouTubeShortsLink(linkPart ?? "") ? "vertical" : orientation;

      rows.push({
        title: titlePart || `Untitled (${youtubeId})`,
        youtubeId,
        orientation: rowOrientation,
        published: false, // Land as drafts so titles can be filled in first.
        position: position++,
      });
    }

    if (rows.length === 0) return fail("None of those lines contained a valid YouTube link.");

    // Resolve each row's artwork up front; a paste of a dozen links is still
    // only a dozen HEAD requests.
    for (const row of rows) {
      row.thumbnailUrl = await resolveBestThumbnail(row.youtubeId, row.orientation ?? "horizontal");
    }

    await db.insert(videos).values(rows);
    await recordActivity(session, {
      action: "created",
      entity: "video",
      summary: `bulk imported ${rows.length} ${orientation} video(s)`,
    });
    revalidateContent("videos");

    const suffix = skipped.length > 0 ? ` ${skipped.length} line(s) were skipped.` : "";
    return succeed(`Imported ${rows.length} video(s) as drafts.${suffix}`);
  });
}

/**
 * Re-asks YouTube for every video's thumbnail.
 *
 * Artwork is resolved when a video is saved, but a creator can change it
 * afterwards, and older rows predate this being stored at all. Skips any
 * video whose thumbnail was set by hand.
 */
export async function refreshThumbnailsAction(
  _prev: ActionState,
  _form: FormData,
): Promise<ActionState> {
  return attempt(async () => {
    const session = await requireSession();
    const db = getDb();

    const rows = await db
      .select({
        id: videos.id,
        youtubeId: videos.youtubeId,
        orientation: videos.orientation,
        thumbnailUrl: videos.thumbnailUrl,
      })
      .from(videos);

    let updated = 0;
    let kept = 0;

    for (const row of rows) {
      if (row.thumbnailUrl && !isDerivedYouTubeThumbnail(row.thumbnailUrl)) {
        kept += 1; // set by hand, leave it alone
        continue;
      }

      const resolved = await resolveBestThumbnail(row.youtubeId, row.orientation);
      if (!resolved || resolved === row.thumbnailUrl) continue;

      await db
        .update(videos)
        .set({ thumbnailUrl: resolved, updatedAt: raw`now()` })
        .where(eq(videos.id, row.id));
      updated += 1;
    }

    await recordActivity(session, {
      action: "updated",
      entity: "video",
      summary: `refreshed ${updated} thumbnail(s) from YouTube`,
    });
    revalidateContent("videos");

    const suffix = kept > 0 ? ` ${kept} custom thumbnail(s) left untouched.` : "";
    return succeed(`Refreshed ${updated} thumbnail(s).${suffix}`);
  });
}
