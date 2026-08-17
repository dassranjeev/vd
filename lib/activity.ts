import "server-only";

import { activityLog, tryDb } from "@/lib/db";
import type { SessionPayload } from "@/lib/auth/session";

type LogInput = {
  action: "created" | "updated" | "deleted" | "reordered" | "login" | "logout" | "published";
  entity: string;
  entityId?: string;
  summary?: string;
};

/**
 * Fire-and-forget audit trail. Never allowed to fail a mutation — if the log
 * write breaks, the content change it describes has already succeeded.
 */
export async function recordActivity(session: SessionPayload | null, input: LogInput) {
  const db = tryDb();
  if (!db) return;
  try {
    await db.insert(activityLog).values({
      userId: session?.sub ?? null,
      userEmail: session?.email ?? "system",
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? "",
      summary: input.summary ?? "",
    });
  } catch {
    // Intentionally swallowed.
  }
}
