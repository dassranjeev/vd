"use server";

import { eq, sql as raw } from "drizzle-orm";

import { recordActivity } from "@/lib/activity";
import { requireSession } from "@/lib/auth";
import { revalidateContent } from "@/lib/cache";
import { getDb, sections, settings } from "@/lib/db";
import { setPath, type PatchValue } from "@/lib/patch-path";
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

    setPath(next, input.path, input.value);

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

/** Prose gets a longer allowance than a heading or label. */
const MAX_LENGTH: Record<string, number> = { body: 5000 };

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
    const value = input.value.slice(0, MAX_LENGTH[field] ?? 200);

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
