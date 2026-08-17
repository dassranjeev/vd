import { desc } from "drizzle-orm";

import { MediaManager } from "@/components/admin/MediaManager";
import { Notice, PageHeader } from "@/components/admin/ui";
import { requireSession } from "@/lib/auth";
import { getDb, isDatabaseConfigured, media } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function MediaPage() {
  await requireSession();

  let items: (typeof media.$inferSelect)[] = [];
  let error: string | null = null;

  if (!isDatabaseConfigured) {
    error = "no-database";
  } else {
    try {
      items = await getDb().select().from(media).orderBy(desc(media.createdAt)).limit(200);
    } catch (err) {
      error = err instanceof Error ? err.message : "unknown";
    }
  }

  return (
    <>
      <PageHeader
        title="Media library"
        description="Hero reels, poster frames, and custom thumbnails. Copy a URL and paste it wherever it's needed."
      />

      {error ? (
        <Notice tone="warning" title="Can't load the library">
          {error === "no-database"
            ? "No DATABASE_URL is configured on this deployment."
            : "The database is unreachable or not initialised yet. Run the setup step."}
        </Notice>
      ) : (
        <MediaManager items={items} blobEnabled={Boolean(process.env.BLOB_READ_WRITE_TOKEN)} />
      )}
    </>
  );
}
