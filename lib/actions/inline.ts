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

const SECTION_TEXT_FIELDS = ["title", "subtitle", "body"] as const;
export type SectionTextField = (typeof SECTION_TEXT_FIELDS)[number];

/** Inline edit for a section's own heading, meta label, or rich-text body. */
export async function patchSectionTextAction(input: {
  id: string;
  field: string;
  value: string;
}): Promise<ActionState> {
  return attempt(async () => {
    const session = await requireSession();

    if (!(SECTION_TEXT_FIELDS as readonly string[]).includes(input.field)) {
      return fail(`"${input.field}" isn't an editable section field.`);
    }
    const field = input.field as SectionTextField;
    const value = input.value.slice(0, field === "body" ? 5000 : 200);

    const db = getDb();
    const [existing] = await db
      .select({ id: sections.id, config: sections.config })
      .from(sections)
      .where(eq(sections.id, input.id))
      .limit(1);
    if (!existing) return fail("That section no longer exists.");

    if (field === "body") {
      const config = { ...((existing.config ?? {}) as Record<string, unknown>), body: value };
      await db.update(sections).set({ config, updatedAt: raw`now()` }).where(eq(sections.id, input.id));
    } else {
      await db
        .update(sections)
        .set({ [field]: value, updatedAt: raw`now()` })
        .where(eq(sections.id, input.id));
    }

    await recordActivity(session, {
      action: "updated",
      entity: "section",
      entityId: input.id,
      summary: `inline edit — ${field}`,
    });
    revalidateContent("sections");
    return succeed("Saved");
  });
}
