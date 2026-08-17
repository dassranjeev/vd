import type { Metadata } from "next";

import { Sidebar } from "@/components/admin/Sidebar";
import { eq, sql as raw } from "drizzle-orm";

import { getSession } from "@/lib/auth";
import { getDb, messages } from "@/lib/db";

export const metadata: Metadata = {
  title: "Studio CMS",
  robots: { index: false, follow: false },
};

/** Unread badge in the sidebar. Never allowed to break the shell. */
async function unreadMessageCount() {
  try {
    const [row] = await getDb()
      .select({ count: raw<number>`count(*)::int` })
      .from(messages)
      .where(eq(messages.status, "new"));
    return row?.count ?? 0;
  } catch {
    return 0;
  }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  // Middleware already redirected unauthenticated visitors everywhere except
  // /admin/login, which renders standalone without the sidebar shell.
  if (!session) {
    return <div className="min-h-screen bg-[#050505] text-white">{children}</div>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#050505] text-white lg:flex-row">
      <Sidebar
        user={{ name: session.name, email: session.email, role: session.role }}
        unreadCount={await unreadMessageCount()}
      />
      <main className="admin-scroll min-w-0 flex-1 px-5 py-8 md:px-8 lg:max-h-screen lg:overflow-y-auto lg:px-10">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
