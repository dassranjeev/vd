import { asc } from "drizzle-orm";

import { TestimonialsManager } from "@/components/admin/collections/TestimonialsManager";
import { Notice, PageHeader } from "@/components/admin/ui";
import { requireSession } from "@/lib/auth";
import { getDb, isDatabaseConfigured, testimonials } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function TestimonialsPage() {
  await requireSession();

  let rows: (typeof testimonials.$inferSelect)[] = [];
  let error: string | null = null;

  if (!isDatabaseConfigured) {
    error = "no-database";
  } else {
    try {
      rows = await getDb().select().from(testimonials).orderBy(asc(testimonials.position), asc(testimonials.createdAt));
    } catch (err) {
      error = err instanceof Error ? err.message : "unknown";
    }
  }

  return (
    <>
      <PageHeader title="Testimonials" description="Client quotes shown on the homepage." />

      {error ? (
        <Notice tone="warning" title="Can't load this list">
          {error === "no-database"
            ? "No DATABASE_URL is configured on this deployment."
            : "The table may not exist yet — run the setup step to add the newer tables."}
        </Notice>
      ) : (
        <TestimonialsManager testimonials={rows} />
      )}
    </>
  );
}
