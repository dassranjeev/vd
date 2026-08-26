import { desc } from "drizzle-orm";
import { ArrowUpRight, Plus } from "lucide-react";
import Link from "next/link";

import { ButtonLink, Card, CardHeader, EmptyState, Notice, PageHeader, StatTile } from "@/components/admin/ui";
import { requireSession } from "@/lib/auth";
import { activityLog, getDb, isDatabaseConfigured, messages } from "@/lib/db";
import { contentCounts } from "@/lib/db/setup";
import { Time } from "@/components/admin/Time";

export const dynamic = "force-dynamic";

type Dashboard = {
  ready: boolean;
  error?: string;
  counts: Awaited<ReturnType<typeof contentCounts>>;
  recentMessages: { id: string; name: string; email: string; subject: string; createdAt: Date; status: string }[];
  recentActivity: { id: string; userEmail: string; action: string; entity: string; summary: string; createdAt: Date }[];
};

async function loadDashboard(): Promise<Dashboard> {
  const empty = { videos: 0, published: 0, sections: 0, media: 0, messages: 0, unread: 0, users: 0 };

  if (!isDatabaseConfigured) {
    return { ready: false, error: "no-database", counts: empty, recentMessages: [], recentActivity: [] };
  }

  try {
    const db = getDb();
    const [counts, recentMessages, recentActivity] = await Promise.all([
      contentCounts(),
      db
        .select({
          id: messages.id,
          name: messages.name,
          email: messages.email,
          subject: messages.subject,
          createdAt: messages.createdAt,
          status: messages.status,
        })
        .from(messages)
        .orderBy(desc(messages.createdAt))
        .limit(5),
      db
        .select({
          id: activityLog.id,
          userEmail: activityLog.userEmail,
          action: activityLog.action,
          entity: activityLog.entity,
          summary: activityLog.summary,
          createdAt: activityLog.createdAt,
        })
        .from(activityLog)
        .orderBy(desc(activityLog.createdAt))
        .limit(8),
    ]);

    return { ready: true, counts, recentMessages, recentActivity };
  } catch (error) {
    return {
      ready: false,
      error: error instanceof Error ? error.message : "unknown",
      counts: empty,
      recentMessages: [],
      recentActivity: [],
    };
  }
}

export default async function AdminDashboard() {
  const session = await requireSession();
  const data = await loadDashboard();

  return (
    <>
      <PageHeader
        title={`Welcome back${session.name ? `, ${session.name.split(" ")[0]}` : ""}`}
        description="Everything on the public site is editable here. Changes go live immediately."
        action={
          <ButtonLink href="/admin/videos/new" variant="primary">
            <Plus />
            Add video
          </ButtonLink>
        }
      />

      {!data.ready && (
        <div className="mb-8">
          <Notice tone="warning" title="The database isn't ready yet">
            {data.error === "no-database" ? (
              <p>
                No <code className="text-white">DATABASE_URL</code> is configured. Add a Postgres
                connection string to your environment variables and redeploy.
              </p>
            ) : (
              <p>
                Couldn&apos;t read from the database — the tables may not exist yet. Run{" "}
                <code className="text-white">npm run db:setup</code> locally, or POST to{" "}
                <code className="text-white">/api/admin/setup</code>.
              </p>
            )}
            <p className="mt-1.5">
              Until then the public site renders from its built-in default content, so nothing is broken
              for visitors.
            </p>
          </Notice>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Videos"
          value={data.counts.videos}
          hint={`${data.counts.published} live`}
          href="/admin/videos"
        />
        <StatTile label="Page sections" value={data.counts.sections} href="/admin/sections" />
        <StatTile
          label="Messages"
          value={data.counts.messages}
          hint={data.counts.unread > 0 ? `${data.counts.unread} unread` : "all read"}
          href="/admin/messages"
        />
        <StatTile label="Media assets" value={data.counts.media} href="/admin/media" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Recent enquiries"
            description="Submissions from the contact form."
            action={
              <Link
                href="/admin/messages"
                className="inline-flex items-center gap-1 text-xs text-white/45 transition-colors hover:text-white"
              >
                All messages <ArrowUpRight className="size-3" />
              </Link>
            }
          />
          {data.recentMessages.length === 0 ? (
            <EmptyState
              title="No messages yet"
              description="Turn on the enquiry form in Content & SEO → Contact to start collecting them."
            />
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {data.recentMessages.map((message) => (
                <li key={message.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-white/85">
                      {message.name}
                      {message.status === "new" && (
                        <span className="ml-2 align-middle text-[10px] uppercase tracking-widest text-sky-300">
                          new
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-white/35">
                      {message.subject || message.email}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-white/30">
                    <Time value={message.createdAt} relative />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Activity" description="Who changed what, and when." />
          {data.recentActivity.length === 0 ? (
            <EmptyState title="Nothing logged yet" description="Every edit you make shows up here." />
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {data.recentActivity.map((entry) => (
                <li key={entry.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-white/80">
                      <span className="text-white/45">{entry.action}</span> {entry.entity}
                      {entry.summary && <span className="text-white/45"> — {entry.summary}</span>}
                    </p>
                    <p className="truncate text-xs text-white/30">{entry.userEmail}</p>
                  </div>
                  <span className="shrink-0 text-xs text-white/30">
                    <Time value={entry.createdAt} relative />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
