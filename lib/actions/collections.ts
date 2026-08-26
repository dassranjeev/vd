"use server";

import { eq, inArray, sql as raw } from "drizzle-orm";
import { z } from "zod";

import { recordActivity } from "@/lib/activity";
import { requireSession } from "@/lib/auth";
import { revalidateContent } from "@/lib/cache";
import { getDb, logos, photos, posts, testimonials } from "@/lib/db";
import { slugify } from "@/lib/utils";

import { attempt, fail, readBoolean, readNumber, readString, succeed, type ActionState } from "./types";

/**
 * CRUD for the four content collections behind the newer homepage bands:
 * photos, client logos, testimonials and blog posts.
 *
 * They follow the same shape as the video actions — validate, write, log,
 * revalidate — so the admin screens and the front-end editor can share them.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Tables the generic reorder is allowed to touch, and their cache tag. */
const REORDERABLE = {
  photos: { table: photos, tag: "photos" },
  logos: { table: logos, tag: "logos" },
  testimonials: { table: testimonials, tag: "testimonials" },
  posts: { table: posts, tag: "posts" },
} as const;

type ReorderableName = keyof typeof REORDERABLE;

function fieldErrors(error: z.ZodError) {
  return Object.fromEntries(
    error.issues.map((issue) => [String(issue.path[0] ?? "form"), issue.message]),
  );
}

/**
 * Next free slot at the end of a collection.
 *
 * Uses a raw aggregate rather than a generic Drizzle helper: column types are
 * table-specific, so one typed helper cannot span four tables without casts
 * that would defeat the point. The table name comes from a literal union and
 * is passed through sql.identifier, so it is quoted and cannot be injected.
 */
async function nextPosition(table: ReorderableName) {
  const rows = await getDb().execute<{ next: number }>(
    raw`select coalesce(max(position), -1) + 1 as next from ${raw.identifier(table)}`,
  );
  const row = Array.isArray(rows) ? rows[0] : undefined;
  return Number(row?.next ?? 0);
}

/* ─────────────────────── generic reorder ───────────────────── */

/**
 * Whole-list reordering shared by every collection. The table name is checked
 * against a whitelist, so a browser cannot name an arbitrary relation.
 */
export async function reorderCollectionAction(input: {
  collection: string;
  ids: unknown;
}): Promise<ActionState> {
  return attempt(async () => {
    const session = await requireSession();

    const entry = REORDERABLE[input.collection as ReorderableName];
    if (!entry) return fail(`"${input.collection}" cannot be reordered.`);

    if (!Array.isArray(input.ids) || input.ids.length === 0) return fail("That ordering wasn't valid.");
    const ordered = input.ids.filter((id): id is string => typeof id === "string" && UUID.test(id));
    if (ordered.length !== input.ids.length || new Set(ordered).size !== ordered.length) {
      return fail("That ordering wasn't valid.");
    }

    const db = getDb();
    const table = entry.table;

    const existing = await db
      .select({ id: table.id })
      .from(table as never)
      .where(inArray(table.id, ordered));
    if (existing.length !== ordered.length) {
      return fail("The list changed while you were dragging — reload and try again.");
    }

    await db.transaction(async (tx) => {
      for (const [index, id] of ordered.entries()) {
        await tx
          .update(table as never)
          .set({ position: index } as never)
          .where(eq(table.id, id));
      }
    });

    await recordActivity(session, {
      action: "reordered",
      entity: input.collection,
      summary: `reordered ${ordered.length} items`,
    });
    revalidateContent(entry.tag);
    return succeed("Order saved");
  });
}

/* ────────────────────────── photos ────────────────────────── */

const photoInput = z.object({
  url: z.string().min(1, "An image URL is required.").max(600),
  alt: z.string().max(300).default(""),
  caption: z.string().max(300).default(""),
  aspect: z.enum(["portrait", "square", "landscape", "tall", "wide"]),
  category: z.string().max(80).default(""),
  published: z.boolean().default(true),
});

export async function savePhotoAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return attempt(async () => {
    const session = await requireSession();
    const id = readString(form, "id");

    const parsed = photoInput.safeParse({
      url: readString(form, "url"),
      alt: readString(form, "alt"),
      caption: readString(form, "caption"),
      aspect: readString(form, "aspect", "portrait"),
      category: readString(form, "category"),
      published: readBoolean(form, "published"),
    });
    if (!parsed.success) return fail("Please fix the highlighted fields.", fieldErrors(parsed.error));

    const db = getDb();
    if (id) {
      await db.update(photos).set({ ...parsed.data, updatedAt: raw`now()` }).where(eq(photos.id, id));
    } else {
      await db.insert(photos).values({ ...parsed.data, position: await nextPosition("photos") });
    }

    await recordActivity(session, {
      action: id ? "updated" : "created",
      entity: "photo",
      entityId: id,
      summary: parsed.data.alt || parsed.data.url,
    });
    revalidateContent("photos");
    return succeed(id ? "Photo updated." : "Photo added.");
  });
}

export async function deletePhotoAction(form: FormData) {
  const session = await requireSession();
  const id = readString(form, "id");
  if (!id) return;

  await getDb().delete(photos).where(eq(photos.id, id));
  await recordActivity(session, { action: "deleted", entity: "photo", entityId: id });
  revalidateContent("photos");
}

export async function togglePhotoAction(form: FormData) {
  await requireSession();
  const id = readString(form, "id");
  if (!id) return;

  await getDb()
    .update(photos)
    .set({ published: raw`not ${photos.published}`, updatedAt: raw`now()` })
    .where(eq(photos.id, id));
  revalidateContent("photos");
}

/* ─────────────────────────── logos ────────────────────────── */

const logoInput = z.object({
  name: z.string().min(1, "A client name is required.").max(120),
  imageUrl: z.string().max(600).default(""),
  url: z.string().max(600).default(""),
  enabled: z.boolean().default(true),
});

export async function saveLogoAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return attempt(async () => {
    const session = await requireSession();
    const id = readString(form, "id");

    const parsed = logoInput.safeParse({
      name: readString(form, "name"),
      imageUrl: readString(form, "imageUrl"),
      url: readString(form, "url"),
      enabled: readBoolean(form, "enabled"),
    });
    if (!parsed.success) return fail("Please fix the highlighted fields.", fieldErrors(parsed.error));

    const db = getDb();
    if (id) {
      await db.update(logos).set(parsed.data).where(eq(logos.id, id));
    } else {
      await db.insert(logos).values({ ...parsed.data, position: await nextPosition("logos") });
    }

    await recordActivity(session, {
      action: id ? "updated" : "created",
      entity: "client logo",
      entityId: id,
      summary: parsed.data.name,
    });
    revalidateContent("logos");
    return succeed(id ? "Logo updated." : `Added ${parsed.data.name}.`);
  });
}

export async function deleteLogoAction(form: FormData) {
  const session = await requireSession();
  const id = readString(form, "id");
  if (!id) return;

  await getDb().delete(logos).where(eq(logos.id, id));
  await recordActivity(session, { action: "deleted", entity: "client logo", entityId: id });
  revalidateContent("logos");
}

export async function toggleLogoAction(form: FormData) {
  await requireSession();
  const id = readString(form, "id");
  if (!id) return;

  await getDb()
    .update(logos)
    .set({ enabled: raw`not ${logos.enabled}` })
    .where(eq(logos.id, id));
  revalidateContent("logos");
}

/* ───────────────────────── testimonials ───────────────────── */

const testimonialInput = z.object({
  quote: z.string().min(1, "The quote is required.").max(1200),
  author: z.string().min(1, "Who said it?").max(120),
  role: z.string().max(120).default(""),
  company: z.string().max(120).default(""),
  avatarUrl: z.string().max(600).default(""),
  rating: z.number().int().min(0).max(5),
  featured: z.boolean().default(false),
  published: z.boolean().default(true),
});

export async function saveTestimonialAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return attempt(async () => {
    const session = await requireSession();
    const id = readString(form, "id");

    const parsed = testimonialInput.safeParse({
      quote: readString(form, "quote"),
      author: readString(form, "author"),
      role: readString(form, "role"),
      company: readString(form, "company"),
      avatarUrl: readString(form, "avatarUrl"),
      rating: readNumber(form, "rating", 5),
      featured: readBoolean(form, "featured"),
      published: readBoolean(form, "published"),
    });
    if (!parsed.success) return fail("Please fix the highlighted fields.", fieldErrors(parsed.error));

    const db = getDb();
    if (id) {
      await db
        .update(testimonials)
        .set({ ...parsed.data, updatedAt: raw`now()` })
        .where(eq(testimonials.id, id));
    } else {
      await db.insert(testimonials).values({ ...parsed.data, position: await nextPosition("testimonials") });
    }

    await recordActivity(session, {
      action: id ? "updated" : "created",
      entity: "testimonial",
      entityId: id,
      summary: parsed.data.author,
    });
    revalidateContent("testimonials");
    return succeed(id ? "Testimonial updated." : `Added ${parsed.data.author}.`);
  });
}

export async function deleteTestimonialAction(form: FormData) {
  const session = await requireSession();
  const id = readString(form, "id");
  if (!id) return;

  await getDb().delete(testimonials).where(eq(testimonials.id, id));
  await recordActivity(session, { action: "deleted", entity: "testimonial", entityId: id });
  revalidateContent("testimonials");
}

export async function toggleTestimonialAction(form: FormData) {
  await requireSession();
  const id = readString(form, "id");
  if (!id) return;

  await getDb()
    .update(testimonials)
    .set({ published: raw`not ${testimonials.published}`, updatedAt: raw`now()` })
    .where(eq(testimonials.id, id));
  revalidateContent("testimonials");
}

/* ────────────────────────── blog posts ────────────────────── */

const postInput = z.object({
  title: z.string().min(1, "A title is required.").max(200),
  excerpt: z.string().max(600).default(""),
  body: z.string().max(40000).default(""),
  coverUrl: z.string().max(600).default(""),
  tags: z.string().max(300).default(""),
  published: z.boolean().default(false),
});

/** Rough reading time, so editors do not have to guess. */
function readingMinutes(body: string) {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export async function savePostAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const id = readString(form, "id");

  return attempt(async () => {
    const session = await requireSession();

    const parsed = postInput.safeParse({
      title: readString(form, "title"),
      excerpt: readString(form, "excerpt"),
      body: readString(form, "body"),
      coverUrl: readString(form, "coverUrl"),
      tags: readString(form, "tags"),
      published: readBoolean(form, "published"),
    });
    if (!parsed.success) return fail("Please fix the highlighted fields.", fieldErrors(parsed.error));

    const db = getDb();

    // Slugs are unique and form the public URL, so keep one stable per post and
    // suffix on collision rather than failing the save.
    const requested = slugify(readString(form, "slug") || parsed.data.title) || "post";
    let slug = requested;
    for (let attemptIndex = 2; attemptIndex < 60; attemptIndex += 1) {
      const [clash] = await db.select({ id: posts.id }).from(posts).where(eq(posts.slug, slug)).limit(1);
      if (!clash || clash.id === id) break;
      slug = `${requested}-${attemptIndex}`;
    }

    const values = {
      ...parsed.data,
      slug,
      readMinutes: readingMinutes(parsed.data.body),
    };

    if (id) {
      // Stamp publishedAt the first time it actually goes live.
      const [existing] = await db
        .select({ publishedAt: posts.publishedAt })
        .from(posts)
        .where(eq(posts.id, id))
        .limit(1);
      const publishedAt =
        parsed.data.published && !existing?.publishedAt ? new Date() : existing?.publishedAt ?? null;

      await db.update(posts).set({ ...values, publishedAt, updatedAt: raw`now()` }).where(eq(posts.id, id));
    } else {
      await db.insert(posts).values({
        ...values,
        publishedAt: parsed.data.published ? new Date() : null,
        position: await nextPosition("posts"),
      });
    }

    await recordActivity(session, {
      action: id ? "updated" : "created",
      entity: "post",
      entityId: id,
      summary: parsed.data.title,
    });
    revalidateContent("posts");
    return succeed(id ? "Post saved." : "Post created.");
  });
}

export async function deletePostAction(form: FormData) {
  const session = await requireSession();
  const id = readString(form, "id");
  if (!id) return;

  const [removed] = await getDb().delete(posts).where(eq(posts.id, id)).returning({ title: posts.title });
  await recordActivity(session, {
    action: "deleted",
    entity: "post",
    entityId: id,
    summary: removed?.title ?? id,
  });
  revalidateContent("posts");
}

export async function togglePostAction(form: FormData) {
  await requireSession();
  const id = readString(form, "id");
  if (!id) return;

  const db = getDb();
  const [existing] = await db
    .select({ published: posts.published, publishedAt: posts.publishedAt })
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1);
  if (!existing) return;

  const goingLive = !existing.published;
  await db
    .update(posts)
    .set({
      published: goingLive,
      publishedAt: goingLive && !existing.publishedAt ? new Date() : existing.publishedAt,
      updatedAt: raw`now()`,
    })
    .where(eq(posts.id, id));

  revalidateContent("posts");
}
