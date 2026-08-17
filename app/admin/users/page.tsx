import { asc } from "drizzle-orm";

import { UsersManager, type UserRow } from "@/components/admin/UsersManager";
import { Notice, PageHeader } from "@/components/admin/ui";
import { getSession } from "@/lib/auth";
import { getDb, isDatabaseConfigured, users } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await getSession();

  if (!session) return null; // Middleware handles the redirect.

  if (session.role !== "admin") {
    return (
      <>
        <PageHeader title="Team" />
        <Notice tone="warning" title="Administrators only">
          Your account has the editor role, which can manage content but not the team. Ask an
          administrator if you need access.
        </Notice>
      </>
    );
  }

  let rows: UserRow[] = [];
  let error: string | null = null;

  if (!isDatabaseConfigured) {
    error = "no-database";
  } else {
    try {
      rows = await getDb()
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          lastLoginAt: users.lastLoginAt,
        })
        .from(users)
        .orderBy(asc(users.createdAt));
    } catch (err) {
      error = err instanceof Error ? err.message : "unknown";
    }
  }

  return (
    <>
      <PageHeader
        title="Team"
        description="Who can sign in to the CMS. At least one active administrator is always kept."
      />

      {error ? (
        <Notice tone="warning" title="Can't load accounts">
          {error === "no-database"
            ? "No DATABASE_URL is configured on this deployment."
            : "The database is unreachable or not initialised yet. Run the setup step."}
        </Notice>
      ) : (
        <UsersManager users={rows} currentUserId={session.sub} />
      )}
    </>
  );
}
