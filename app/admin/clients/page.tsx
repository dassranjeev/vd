import { asc } from "drizzle-orm";

import { LogosManager } from "@/components/admin/collections/LogosManager";
import { Notice, PageHeader } from "@/components/admin/ui";
import { requireSession } from "@/lib/auth";
import { getDb, isDatabaseConfigured, logos } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function LogosPage() {
  await requireSession();

  let rows: (typeof logos.$inferSelect)[] = [];
  let error: string | null = null;

  if (!isDatabaseConfigured) {
    error = "no-database";
  } else {
    try {
      rows = await getDb().select().from(logos).orderBy(asc(logos.position), asc(logos.createdAt));
    } catch (err) {
      error = err instanceof Error ? err.message : "unknown";
    }
  }

  return (
    <>
      <PageHeader title="Clients" description="Logos for the client carousel." />

      {error ? (
        <Notice tone="warning" title="Can't load this list">
          {error === "no-database"
            ? "No DATABASE_URL is configured on this deployment."
            : "The table may not exist yet — run the setup step to add the newer tables."}
        </Notice>
      ) : (
        <LogosManager logos={rows} />
      )}
    </>
  );
}
