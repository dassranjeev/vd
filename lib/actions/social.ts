"use server";

import { asc, eq, gt, lt, max, sql as raw } from "drizzle-orm";

import { recordActivity } from "@/lib/activity";
import { requireSession } from "@/lib/auth";
import { revalidateContent } from "@/lib/cache";
import { getDb, socialLinks } from "@/lib/db";

import { attempt, fail, readString, succeed, type ActionState } from "./types";

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function createSocialLinkAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return attempt(async () => {
    const session = await requireSession();
    const label = readString(form, "label");
    const url = readString(form, "url");

    if (!label) return fail("Give the link a label.", { label: "A label is required." });
    if (!isHttpUrl(url)) return fail("Enter a full URL.", { url: "Must start with http:// or https://" });

    const db = getDb();
    const [row] = await db.select({ value: max(socialLinks.position) }).from(socialLinks);
    await db.insert(socialLinks).values({ label, url, position: (row?.value ?? -1) + 1 });

    await recordActivity(session, { action: "created", entity: "social link", summary: label });
    revalidateContent("social");
    return succeed(`Added ${label}.`);
  });
}

export async function updateSocialLinkAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return attempt(async () => {
    const session = await requireSession();
    const id = readString(form, "id");
    const label = readString(form, "label");
    const url = readString(form, "url");

    if (!id) return fail("Missing link ID.");
    if (!label) return fail("Give the link a label.", { label: "A label is required." });
    if (!isHttpUrl(url)) return fail("Enter a full URL.", { url: "Must start with http:// or https://" });

    await getDb().update(socialLinks).set({ label, url }).where(eq(socialLinks.id, id));
    await recordActivity(session, { action: "updated", entity: "social link", entityId: id, summary: label });
    revalidateContent("social");
    return succeed("Link updated.");
  });
}

export async function toggleSocialLinkAction(form: FormData) {
  await requireSession();
  const id = readString(form, "id");
  if (!id) return;

  await getDb()
    .update(socialLinks)
    .set({ enabled: raw`not ${socialLinks.enabled}` })
    .where(eq(socialLinks.id, id));
  revalidateContent("social");
}

export async function deleteSocialLinkAction(form: FormData) {
  const session = await requireSession();
  const id = readString(form, "id");
  if (!id) return;

  const [removed] = await getDb()
    .delete(socialLinks)
    .where(eq(socialLinks.id, id))
    .returning({ label: socialLinks.label });

  await recordActivity(session, {
    action: "deleted",
    entity: "social link",
    entityId: id,
    summary: removed?.label ?? id,
  });
  revalidateContent("social");
}

export async function moveSocialLinkAction(form: FormData) {
  await requireSession();
  const id = readString(form, "id");
  const direction = readString(form, "direction") === "up" ? "up" : "down";
  if (!id) return;

  const db = getDb();
  const [current] = await db
    .select({ id: socialLinks.id, position: socialLinks.position })
    .from(socialLinks)
    .where(eq(socialLinks.id, id))
    .limit(1);
  if (!current) return;

  const [neighbour] = await db
    .select({ id: socialLinks.id, position: socialLinks.position })
    .from(socialLinks)
    .where(
      direction === "up"
        ? lt(socialLinks.position, current.position)
        : gt(socialLinks.position, current.position),
    )
    .orderBy(direction === "up" ? raw`${socialLinks.position} desc` : asc(socialLinks.position))
    .limit(1);
  if (!neighbour) return;

  await db.transaction(async (tx) => {
    await tx.update(socialLinks).set({ position: neighbour.position }).where(eq(socialLinks.id, current.id));
    await tx.update(socialLinks).set({ position: current.position }).where(eq(socialLinks.id, neighbour.id));
  });
  revalidateContent("social");
}
