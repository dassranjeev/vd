"use server";

import { asc, eq, inArray } from "drizzle-orm";

import { recordActivity } from "@/lib/activity";
import { requireSession } from "@/lib/auth";
import { revalidateContent } from "@/lib/cache";
import { getDb, sections, videos } from "@/lib/db";

import { attempt, fail, succeed, type ActionState } from "./types";

/**
 * Whole-list reordering for the drag-and-drop editor.
 *
 * The up/down buttons swap two neighbours; a drag can move an item across many
 * positions at once. Writing the entire order in one transaction keeps it atomic
 * and costs a single round trip, rather than replaying N swaps.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Ids arrive from the browser, so validate shape and membership before writing. */
function sanitiseIds(ids: unknown): string[] | null {
  if (!Array.isArray(ids) || ids.length === 0) return null;
  const clean = ids.filter((id): id is string => typeof id === "string" && UUID.test(id));
  if (clean.length !== ids.length) return null;
  if (new Set(clean).size !== clean.length) return null; // no duplicates
  return clean;
}

export async function reorderSectionsAction(ids: unknown): Promise<ActionState> {
  return attempt(async () => {
    const session = await requireSession();

    const ordered = sanitiseIds(ids);
    if (!ordered) return fail("That ordering wasn't valid.");

    const db = getDb();

    // Every id must be a real section; anything else means a stale page.
    const existing = await db
      .select({ id: sections.id })
      .from(sections)
      .where(inArray(sections.id, ordered));
    if (existing.length !== ordered.length) {
      return fail("The page changed while you were dragging — reload and try again.");
    }

    await db.transaction(async (tx) => {
      for (const [index, id] of ordered.entries()) {
        await tx.update(sections).set({ position: index }).where(eq(sections.id, id));
      }
    });

    await recordActivity(session, {
      action: "reordered",
      entity: "section",
      summary: `dragged ${ordered.length} sections into a new order`,
    });
    revalidateContent("sections");
    return succeed("Order saved");
  });
}

export async function reorderVideosAction(input: {
  orientation: string;
  ids: unknown;
}): Promise<ActionState> {
  return attempt(async () => {
    const session = await requireSession();

    const orientation = input.orientation === "vertical" ? "vertical" : "horizontal";
    const ordered = sanitiseIds(input.ids);
    if (!ordered) return fail("That ordering wasn't valid.");

    const db = getDb();

    // Positions are per-orientation, so refuse ids from the other band.
    const existing = await db
      .select({ id: videos.id })
      .from(videos)
      .where(inArray(videos.id, ordered));
    if (existing.length !== ordered.length) {
      return fail("The reel changed while you were dragging — reload and try again.");
    }

    const inBand = await db
      .select({ id: videos.id })
      .from(videos)
      .where(eq(videos.orientation, orientation))
      .orderBy(asc(videos.position));
    const bandIds = new Set(inBand.map((row) => row.id));
    if (ordered.some((id) => !bandIds.has(id))) {
      return fail("Those videos aren't all in this band.");
    }

    await db.transaction(async (tx) => {
      for (const [index, id] of ordered.entries()) {
        await tx.update(videos).set({ position: index }).where(eq(videos.id, id));
      }
    });

    await recordActivity(session, {
      action: "reordered",
      entity: "video",
      summary: `dragged ${ordered.length} ${orientation} videos into a new order`,
    });
    revalidateContent("videos");
    return succeed("Order saved");
  });
}
