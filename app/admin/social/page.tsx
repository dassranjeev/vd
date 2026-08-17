import { asc } from "drizzle-orm";

import { SocialManager } from "@/components/admin/SocialManager";
import { Notice, PageHeader } from "@/components/admin/ui";
import { requireSession } from "@/lib/auth";
import { getDb, isDatabaseConfigured, socialLinks } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SocialPage() {
  await requireSession();

  let links: (typeof socialLinks.$inferSelect)[] = [];
  let error: string | null = null;

  if (!isDatabaseConfigured) {
    error = "no-database";
  } else {
    try {
      links = await getDb().select().from(socialLinks).orderBy(asc(socialLinks.position));
    } catch (err) {
      error = err instanceof Error ? err.message : "unknown";
    }
  }

  return (
    <>
      <PageHeader
        title="Social links"
        description="One list, used everywhere the site links out. Reorder, hide, or add profiles."
      />

      {error ? (
        <Notice tone="warning" title="Can't load social links">
          {error === "no-database"
            ? "No DATABASE_URL is configured on this deployment."
            : "The database is unreachable or not initialised yet. Run the setup step."}
        </Notice>
      ) : (
        <SocialManager links={links} />
      )}
    </>
  );
}
