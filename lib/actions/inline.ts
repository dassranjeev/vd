"use server";

import { eq, sql as raw } from "drizzle-orm";

import { recordActivity } from "@/lib/activity";
import { requireSession } from "@/lib/auth";
import { revalidateContent } from "@/lib/cache";
import {
  getDb,
  logos,
  photos,
  posts,
  sections,
  settings,
  socialLinks,
  testimonials,
  videos,
} from "@/lib/db";
import { setPath, type PatchValue } from "@/lib/patch-path";
import { deepSanitize, sanitizeIfHtml } from "@/lib/rich-text";
import { settingsKeys, settingsSchemas, type SettingsKey } from "@/lib/settings";

import { attempt, fail, succeed, type ActionState } from "./types";

/**
 * Single-field writes for the front-end inline editor. The admin panel rebuilds
 * a whole settings group from a form; the inline editor needs to touch one field
 * at a time without disturbing the rest.
 */

export async function patchSettingAction(input: {
  group: string;
  path: string;
  value: PatchValue;
}): Promise<ActionState> {
  return attempt(async () => {
    const session = await requireSession();

    if (!(settingsKeys as string[]).includes(input.group)) {
      return fail(`Unknown settings group "${input.group}".`);
    }
    const group = input.group as SettingsKey;
    const schema = settingsSchemas[group];

    const db = getDb();
    const [existing] = await db.select().from(settings).where(eq(settings.key, group)).limit(1);

    // Start from defaults merged with what's stored, so every schema field
    // exists and unrelated fields are preserved.
    const merged = {
      ...(schema.parse({}) as Record<string, unknown>),
      ...((existing?.value ?? {}) as Record<string, unknown>),
    };
    const next = structuredClone(merged);

    // Every inline edit is HTML-capable now, so clean it before it is stored.
    // A value with no tag comes through untouched.
    setPath(next, input.path, deepSanitize(input.value));

    const parsed = schema.safeParse(next);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "That value isn't valid here.");
    }

    await db
      .insert(settings)
      .values({ key: group, value: parsed.data, updatedBy: session.sub })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: parsed.data, updatedAt: raw`now()`, updatedBy: session.sub },
      });

    await recordActivity(session, {
      action: "updated",
      entity: "settings",
      entityId: group,
      summary: `inline edit — ${group}.${input.path}`,
    });
    revalidateContent("settings");
    return succeed("Saved");
  });
}

/** Editable straight onto the sections row. */
const SECTION_COLUMNS = ["title", "subtitle"] as const;

/** Editable inside the section config blob. */
const SECTION_CONFIG_FIELDS = ["body", "eyebrow", "heading", "ctaLabel", "ctaHref", "imageUrl"] as const;

const SECTION_TEXT_FIELDS = [...SECTION_COLUMNS, ...SECTION_CONFIG_FIELDS] as const;
export type SectionTextField = (typeof SECTION_TEXT_FIELDS)[number];

/** Prose gets a longer allowance than a heading or label. Both leave room for
    markup: a styled heading costs far more characters than its text. */
const MAX_LENGTH: Record<string, number> = { body: 20000 };

/** Inline edit for a section heading, meta label, or any config text field. */
export async function patchSectionTextAction(input: {
  id: string;
  field: string;
  value: string;
}): Promise<ActionState> {
  return attempt(async () => {
    const session = await requireSession();

    if (!(SECTION_TEXT_FIELDS as readonly string[]).includes(input.field)) {
      return fail(`"${input.field}" is not an editable section field.`);
    }
    const field = input.field as SectionTextField;
    // Sanitize after truncating, not before: a cut through the middle of a tag
    // leaves markup the allowlist then discards, rather than storing it broken.
    const truncated = input.value.slice(0, MAX_LENGTH[field] ?? 1000);
    // A heading renders inside an existing <h2>, so it gets the inline
    // vocabulary; only a body may carry paragraphs and lists.
    const value = sanitizeIfHtml(truncated, field === "body" ? "block" : "inline");

    const db = getDb();
    const [existing] = await db
      .select({ id: sections.id, config: sections.config })
      .from(sections)
      .where(eq(sections.id, input.id))
      .limit(1);
    if (!existing) return fail("That section no longer exists.");

    if ((SECTION_COLUMNS as readonly string[]).includes(field)) {
      await db
        .update(sections)
        .set({ [field]: value, updatedAt: raw`now()` })
        .where(eq(sections.id, input.id));
    } else {
      const config = { ...((existing.config ?? {}) as Record<string, unknown>), [field]: value };
      await db.update(sections).set({ config, updatedAt: raw`now()` }).where(eq(sections.id, input.id));
    }

    await recordActivity(session, {
      action: "updated",
      entity: "section",
      entityId: input.id,
      summary: `inline edit ${field}`,
    });
    revalidateContent("sections");
    return succeed("Saved");
  });
}

/* ─────────────────── collection rows ─────────────────── */

/**
 * Display text on a collection row, editable from the page it appears on.
 *
 * Sections and settings are edited through their own actions above; these are
 * the rows behind the video grid, gallery, logo band, testimonials and journal
 * cards. Only text that is actually rendered is listed — a URL or an image path
 * is not display copy and stays in the admin panel, where a broken value is
 * obvious rather than invisible.
 *
 * `touch` says whether the table carries an `updatedAt` to bump; logos and
 * social links do not have one.
 */
const COLLECTIONS = {
  video: { table: videos, tag: "videos", touch: true, fields: ["title", "client", "role", "year"] },
  photo: { table: photos, tag: "photos", touch: true, fields: ["caption", "alt"] },
  logo: { table: logos, tag: "logos", touch: false, fields: ["name"] },
  testimonial: {
    table: testimonials,
    tag: "testimonials",
    touch: true,
    fields: ["quote", "author", "role", "company"],
  },
  post: { table: posts, tag: "posts", touch: true, fields: ["title", "excerpt", "body"] },
  social: { table: socialLinks, tag: "social", touch: false, fields: ["label"] },
} as const;

export type CollectionEntity = keyof typeof COLLECTIONS;

/** Prose-length allowance for the one field that is a paragraph, not a label. */
const COLLECTION_MAX: Record<string, number> = { quote: 4000, excerpt: 2000, body: 40000 };

/** Inline edit for a single piece of text on a collection row. */
export async function patchCollectionTextAction(input: {
  entity: string;
  id: string;
  field: string;
  value: string;
}): Promise<ActionState> {
  return attempt(async () => {
    const session = await requireSession();

    const spec = COLLECTIONS[input.entity as CollectionEntity];
    if (!spec) return fail(`"${input.entity}" is not an editable collection.`);
    if (!(spec.fields as readonly string[]).includes(input.field)) {
      return fail(`"${input.field}" is not editable on a ${input.entity}.`);
    }

    // Sanitize after truncating: a cut through the middle of a tag leaves
    // markup the allowlist then discards, rather than storing it broken.
    const truncated = input.value.slice(0, COLLECTION_MAX[input.field] ?? 1000);
    // A post body is a document; everything else renders inside existing markup.
    const value = sanitizeIfHtml(truncated, input.field === "body" ? "block" : "inline");

    const payload: Record<string, unknown> = { [input.field]: value };
    if (spec.touch) payload.updatedAt = raw`now()`;

    // The table is picked at runtime, so drizzle narrows `.set()` to the columns
    // every table in COLLECTIONS has in common — which is almost none of them.
    // The casts are contained here; what actually guarantees safety is that both
    // the entity and the field name were checked against the allowlist above.
    const table = spec.table as typeof videos;
    const db = getDb();
    const updated = await db
      .update(table)
      .set(payload as unknown as Partial<typeof videos.$inferInsert>)
      .where(eq(table.id, input.id))
      .returning({ id: table.id });

    if (updated.length === 0) return fail("That item no longer exists.");

    await recordActivity(session, {
      action: "updated",
      entity: input.entity,
      entityId: input.id,
      summary: `inline edit ${input.field}`,
    });
    revalidateContent(spec.tag);
    return succeed("Saved");
  });
}
