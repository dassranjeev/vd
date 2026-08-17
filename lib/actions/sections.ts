"use server";

import { asc, eq, gt, lt, max, sql as raw } from "drizzle-orm";
import { z } from "zod";

import { recordActivity } from "@/lib/activity";
import { requireSession } from "@/lib/auth";
import { revalidateContent } from "@/lib/cache";
import { getDb, sections } from "@/lib/db";
import { SECTION_TYPES, type SectionType } from "@/lib/types";
import { slugify } from "@/lib/utils";

import { attempt, fail, readNumber, readString, succeed, type ActionState } from "./types";

// SECTION_TYPES lives in lib/types.ts: a "use server" module may only export
// async functions, so re-exporting it from here would break every action in
// this file's module graph.

const configSchema = z.object({
  orientation: z.enum(["horizontal", "vertical"]).optional(),
  layout: z.enum(["grid", "marquee"]).optional(),
  background: z.string().max(40).optional(),
  columns: z.number().int().min(1).max(4).optional(),
  autoScrollSeconds: z.number().min(5).max(300).optional(),
  body: z.string().max(5000).optional(),
});

function readConfig(form: FormData, type: SectionType) {
  const candidate: Record<string, unknown> = {};

  if (type === "videos") {
    candidate.orientation = readString(form, "config.orientation", "horizontal");
    candidate.layout = readString(form, "config.layout", "grid");
    candidate.columns = readNumber(form, "config.columns", 3);
    candidate.autoScrollSeconds = readNumber(form, "config.autoScrollSeconds", 40);
  }
  if (type === "richtext") {
    candidate.body = readString(form, "config.body");
  }
  const background = readString(form, "config.background");
  if (background) candidate.background = background;

  const parsed = configSchema.safeParse(candidate);
  return parsed.success ? parsed.data : {};
}

export async function createSectionAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return attempt(async () => {
    const session = await requireSession();
    const title = readString(form, "title");
    const rawType = readString(form, "type", "videos");
    const type = (SECTION_TYPES as readonly string[]).includes(rawType) ? (rawType as SectionType) : "videos";

    if (!title) return fail("Give the section a title.", { title: "A title is required." });

    const db = getDb();
    const base = slugify(title) || "section";

    // Section keys are unique; suffix until we find a free one.
    let key = base;
    for (let attemptIndex = 2; attemptIndex < 50; attemptIndex += 1) {
      const [clash] = await db.select({ id: sections.id }).from(sections).where(eq(sections.key, key)).limit(1);
      if (!clash) break;
      key = `${base}-${attemptIndex}`;
    }

    const [row] = await db.select({ value: max(sections.position) }).from(sections);
    const [created] = await db
      .insert(sections)
      .values({
        key,
        type,
        title,
        subtitle: readString(form, "subtitle"),
        config: readConfig(form, type),
        position: (row?.value ?? -1) + 1,
        enabled: true,
      })
      .returning({ id: sections.id });

    await recordActivity(session, {
      action: "created",
      entity: "section",
      entityId: created.id,
      summary: title,
    });
    revalidateContent("sections");
    return succeed(`Section "${title}" added.`);
  });
}

export async function updateSectionAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return attempt(async () => {
    const session = await requireSession();
    const id = readString(form, "id");
    if (!id) return fail("Missing section ID.");

    const db = getDb();
    const [existing] = await db
      .select({ type: sections.type, title: sections.title })
      .from(sections)
      .where(eq(sections.id, id))
      .limit(1);
    if (!existing) return fail("That section no longer exists.");

    const type = existing.type as SectionType;

    await db
      .update(sections)
      .set({
        title: readString(form, "title"),
        subtitle: readString(form, "subtitle"),
        config: readConfig(form, type),
        updatedAt: raw`now()`,
      })
      .where(eq(sections.id, id));

    await recordActivity(session, {
      action: "updated",
      entity: "section",
      entityId: id,
      summary: readString(form, "title") || existing.title,
    });
    revalidateContent("sections");
    return succeed("Section updated.");
  });
}

export async function toggleSectionAction(form: FormData) {
  const session = await requireSession();
  const id = readString(form, "id");
  if (!id) return;

  const [updated] = await getDb()
    .update(sections)
    .set({ enabled: raw`not ${sections.enabled}`, updatedAt: raw`now()` })
    .where(eq(sections.id, id))
    .returning({ title: sections.title, key: sections.key, enabled: sections.enabled });

  await recordActivity(session, {
    action: "updated",
    entity: "section",
    entityId: id,
    summary: `${updated?.title || updated?.key} → ${updated?.enabled ? "visible" : "hidden"}`,
  });
  revalidateContent("sections");
}

export async function moveSectionAction(form: FormData) {
  const session = await requireSession();
  const id = readString(form, "id");
  const direction = readString(form, "direction") === "up" ? "up" : "down";
  if (!id) return;

  const db = getDb();
  const [current] = await db
    .select({ id: sections.id, position: sections.position })
    .from(sections)
    .where(eq(sections.id, id))
    .limit(1);
  if (!current) return;

  const [neighbour] = await db
    .select({ id: sections.id, position: sections.position })
    .from(sections)
    .where(direction === "up" ? lt(sections.position, current.position) : gt(sections.position, current.position))
    .orderBy(direction === "up" ? raw`${sections.position} desc` : asc(sections.position))
    .limit(1);
  if (!neighbour) return;

  await db.transaction(async (tx) => {
    await tx.update(sections).set({ position: neighbour.position }).where(eq(sections.id, current.id));
    await tx.update(sections).set({ position: current.position }).where(eq(sections.id, neighbour.id));
  });

  await recordActivity(session, {
    action: "reordered",
    entity: "section",
    entityId: id,
    summary: `moved ${direction}`,
  });
  revalidateContent("sections");
}

export async function deleteSectionAction(form: FormData) {
  const session = await requireSession();
  const id = readString(form, "id");
  if (!id) return;

  const [removed] = await getDb()
    .delete(sections)
    .where(eq(sections.id, id))
    .returning({ key: sections.key });

  await recordActivity(session, {
    action: "deleted",
    entity: "section",
    entityId: id,
    summary: removed?.key ?? id,
  });
  revalidateContent("sections");
}
