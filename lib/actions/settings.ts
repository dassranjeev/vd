"use server";

import { eq, sql as raw } from "drizzle-orm";

import { recordActivity } from "@/lib/activity";
import { requireSession } from "@/lib/auth";
import { revalidateContent } from "@/lib/cache";
import { getDb, settings } from "@/lib/db";
import { settingsFields, settingsKeys, settingsSchemas, type SettingsKey } from "@/lib/settings";

import { attempt, fail, readBoolean, readNumber, readString, succeed, type ActionState } from "./types";

/**
 * Rebuilds one settings group from its form, driven by the field metadata in
 * lib/settings.ts. Adding a field there is enough — no action changes needed.
 *
 * `stored` is the value currently in the database. Merging onto it (rather than
 * onto the defaults) means a schema field that has no form input yet keeps its
 * saved value instead of being silently reset.
 */
function buildValue(key: SettingsKey, form: FormData, stored: Record<string, unknown>) {
  const current = { ...(settingsSchemas[key].parse({}) as Record<string, unknown>), ...stored };
  const next: Record<string, unknown> = { ...current };

  for (const field of settingsFields[key].fields) {
    switch (field.kind) {
      case "boolean":
        next[field.name] = readBoolean(form, field.name);
        break;
      case "number":
        next[field.name] = readNumber(form, field.name, Number(current[field.name] ?? 0));
        break;
      case "list":
        next[field.name] = readString(form, field.name)
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
        break;
      case "lines": {
        // Three parallel arrays submitted as repeated inputs, zipped by index.
        const plain = form.getAll(`${field.name}.plain`).map(String);
        const emphasis = form.getAll(`${field.name}.emphasis`).map(String);
        const suffix = form.getAll(`${field.name}.suffix`).map(String);
        next[field.name] = plain
          .map((value, index) => ({
            plain: value,
            emphasis: emphasis[index] ?? "",
            suffix: suffix[index] ?? "",
          }))
          .filter((line) => line.plain.trim() || line.emphasis.trim());
        break;
      }
      default:
        next[field.name] = readString(form, field.name);
    }
  }

  return next;
}

export async function saveSettingsAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return attempt(async () => {
    const session = await requireSession();
    const rawKey = readString(form, "group");
    if (!(settingsKeys as string[]).includes(rawKey)) return fail("Unknown settings group.");
    const key = rawKey as SettingsKey;

    const db = getDb();
    const [existing] = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
    const stored = (existing?.value ?? {}) as Record<string, unknown>;

    const candidate = buildValue(key, form, stored);
    const parsed = settingsSchemas[key].safeParse(candidate);
    if (!parsed.success) {
      return fail(
        "Please fix the highlighted fields.",
        Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0] ?? "form"), i.message])),
      );
    }

    await db
      .insert(settings)
      .values({ key, value: parsed.data, updatedBy: session.sub })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: parsed.data, updatedAt: raw`now()`, updatedBy: session.sub },
      });

    await recordActivity(session, {
      action: "updated",
      entity: "settings",
      entityId: key,
      summary: `${settingsFields[key].label} settings`,
    });
    revalidateContent("settings");
    return succeed(`${settingsFields[key].label} settings saved.`);
  });
}

/** Restore one group to the built-in defaults. */
export async function resetSettingsAction(form: FormData) {
  const session = await requireSession();
  const rawKey = readString(form, "group");
  if (!(settingsKeys as string[]).includes(rawKey)) return;
  const key = rawKey as SettingsKey;

  await getDb().delete(settings).where(eq(settings.key, key));
  await recordActivity(session, {
    action: "updated",
    entity: "settings",
    entityId: key,
    summary: `reset ${key} to defaults`,
  });
  revalidateContent("settings");
}
