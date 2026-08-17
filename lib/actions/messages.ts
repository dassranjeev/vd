"use server";

import { eq, inArray } from "drizzle-orm";

import { recordActivity } from "@/lib/activity";
import { requireSession } from "@/lib/auth";
import { getDb, messages } from "@/lib/db";

import { readString } from "./types";

const STATUSES = ["new", "read", "archived"] as const;

export async function setMessageStatusAction(form: FormData) {
  await requireSession();
  const id = readString(form, "id");
  const status = readString(form, "status");
  if (!id || !(STATUSES as readonly string[]).includes(status)) return;

  await getDb().update(messages).set({ status }).where(eq(messages.id, id));
}

export async function deleteMessageAction(form: FormData) {
  const session = await requireSession();
  const id = readString(form, "id");
  if (!id) return;

  await getDb().delete(messages).where(eq(messages.id, id));
  await recordActivity(session, { action: "deleted", entity: "message", entityId: id });
}

/** Clears the "new" badge in one go. */
export async function markAllReadAction() {
  await requireSession();
  await getDb().update(messages).set({ status: "read" }).where(inArray(messages.status, ["new"]));
}
