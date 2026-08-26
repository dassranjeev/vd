import { asc, desc } from "drizzle-orm";

import { PostsManager } from "@/components/admin/collections/PostsManager";
import { Notice, PageHeader } from "@/components/admin/ui";
import { requireSession } from "@/lib/auth";
import { getDb, isDatabaseConfigured, posts } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PostsPage() {
  await requireSession();

  let rows: (typeof posts.$inferSelect)[] = [];
  let error: string | null = null;

  if (!isDatabaseConfigured) {
    error = "no-database";
  } else {
    try {
      rows = await getDb().select().from(posts).orderBy(asc(posts.position), desc(posts.createdAt));
    } catch (err) {
      error = err instanceof Error ? err.message : "unknown";
    }
  }

  return (
    <>
      <PageHeader title="Journal" description="Blog posts, each with its own page at /blog/[slug]." />

      {error ? (
        <Notice tone="warning" title="Can't load this list">
          {error === "no-database"
            ? "No DATABASE_URL is configured on this deployment."
            : "The table may not exist yet — run the setup step to add the newer tables."}
        </Notice>
      ) : (
        <PostsManager posts={rows} />
      )}
    </>
  );
}
