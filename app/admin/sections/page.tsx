import { asc } from "drizzle-orm";

import { SectionsManager } from "@/components/admin/SectionsManager";
import { EmptyState, Notice, PageHeader } from "@/components/admin/ui";
import { requireSession } from "@/lib/auth";
import { getDb, isDatabaseConfigured, sections } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SectionsPage() {
  await requireSession();

  let rows: (typeof sections.$inferSelect)[] = [];
  let error: string | null = null;

  if (!isDatabaseConfigured) {
    error = "no-database";
  } else {
    try {
      rows = await getDb().select().from(sections).orderBy(asc(sections.position));
    } catch (err) {
      error = err instanceof Error ? err.message : "unknown";
    }
  }

  return (
    <>
      <PageHeader
        title="Page sections"
        description="The homepage is built from these bands, top to bottom. Reorder, retitle, hide, or add new ones."
      />

      {error && (
        <div className="mb-6">
          <Notice tone="warning" title="Can't load sections">
            {error === "no-database"
              ? "No DATABASE_URL is configured on this deployment."
              : "The database is unreachable or not initialised yet. Run the setup step."}
          </Notice>
        </div>
      )}

      {!error && rows.length === 0 ? (
        <EmptyState
          title="No sections yet"
          description="Run the setup step to seed the original page layout, or add sections one at a time below."
        />
      ) : null}

      {!error && <SectionsManager sections={rows} />}
    </>
  );
}
