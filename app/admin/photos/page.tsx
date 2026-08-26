import { asc } from "drizzle-orm";

import { PhotosManager } from "@/components/admin/collections/PhotosManager";
import { Notice, PageHeader } from "@/components/admin/ui";
import { requireSession } from "@/lib/auth";
import { getDb, isDatabaseConfigured, photos } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PhotosPage() {
  await requireSession();

  let rows: (typeof photos.$inferSelect)[] = [];
  let error: string | null = null;

  if (!isDatabaseConfigured) {
    error = "no-database";
  } else {
    try {
      rows = await getDb().select().from(photos).orderBy(asc(photos.position), asc(photos.createdAt));
    } catch (err) {
      error = err instanceof Error ? err.message : "unknown";
    }
  }

  return (
    <>
      <PageHeader title="Photos & graphics" description="Stills for the masonry gallery band. Reorder to change how the grid reads." />

      {error ? (
        <Notice tone="warning" title="Can't load this list">
          {error === "no-database"
            ? "No DATABASE_URL is configured on this deployment."
            : "The table may not exist yet — run the setup step to add the newer tables."}
        </Notice>
      ) : (
        <PhotosManager photos={rows} />
      )}
    </>
  );
}
