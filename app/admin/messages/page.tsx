import { desc, eq } from "drizzle-orm";
import { Archive, MailOpen, Trash2 } from "lucide-react";
import Link from "next/link";

import { ConfirmSubmit, SubmitButton } from "@/components/admin/form";
import { Badge, Card, EmptyState, Notice, PageHeader } from "@/components/admin/ui";
import {
  deleteMessageAction,
  markAllReadAction,
  setMessageStatusAction,
} from "@/lib/actions/messages";
import { requireSession } from "@/lib/auth";
import { getDb, isDatabaseConfigured, messages } from "@/lib/db";
import { Time } from "@/components/admin/Time";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "new", label: "Unread" },
  { key: "read", label: "Read" },
  { key: "archived", label: "Archived" },
] as const;

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  await requireSession();

  const { filter: requested } = await searchParams;
  const filter = FILTERS.some((option) => option.key === requested) ? requested! : "all";

  let rows: (typeof messages.$inferSelect)[] = [];
  let error: string | null = null;

  if (!isDatabaseConfigured) {
    error = "no-database";
  } else {
    try {
      const db = getDb();
      const query = db.select().from(messages);
      rows = await (filter === "all"
        ? query.orderBy(desc(messages.createdAt)).limit(200)
        : query.where(eq(messages.status, filter)).orderBy(desc(messages.createdAt)).limit(200));
    } catch (err) {
      error = err instanceof Error ? err.message : "unknown";
    }
  }

  return (
    <>
      <PageHeader
        title="Messages"
        description="Enquiries from the contact form. Enable the form under Content & SEO → Contact."
        action={
          <form action={markAllReadAction}>
            <SubmitButton variant="secondary" size="sm" pendingLabel="Marking…">
              <MailOpen />
              Mark all read
            </SubmitButton>
          </form>
        }
      />

      {error && (
        <div className="mb-6">
          <Notice tone="warning" title="Can't load messages">
            {error === "no-database"
              ? "No DATABASE_URL is configured on this deployment."
              : "The database is unreachable or not initialised yet. Run the setup step."}
          </Notice>
        </div>
      )}

      <nav className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((option) => (
          <Link
            key={option.key}
            href={`/admin/messages?filter=${option.key}`}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs transition-colors",
              option.key === filter
                ? "border-white/30 bg-white/[0.09] text-white"
                : "border-white/10 text-white/45 hover:border-white/25 hover:text-white/80",
            )}
          >
            {option.label}
          </Link>
        ))}
      </nav>

      {!error && rows.length === 0 ? (
        <EmptyState
          title="No messages here"
          description="Nothing matches this filter yet."
        />
      ) : (
        <div className="space-y-4">
          {rows.map((message) => (
            <Card key={message.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold text-white">{message.name}</h2>
                    <Badge
                      tone={
                        message.status === "new"
                          ? "info"
                          : message.status === "archived"
                            ? "neutral"
                            : "success"
                      }
                    >
                      {message.status}
                    </Badge>
                  </div>
                  <a
                    href={`mailto:${message.email}?subject=${encodeURIComponent(
                      message.subject ? `Re: ${message.subject}` : "Re: your enquiry",
                    )}`}
                    className="mt-1 block truncate text-xs text-white/45 underline-offset-4 transition-colors hover:text-white hover:underline"
                  >
                    {message.email}
                  </a>
                </div>
                <Time value={message.createdAt} className="shrink-0 text-xs text-white/30" />
              </div>

              {message.subject && (
                <p className="mt-3 text-sm font-medium text-white/80">{message.subject}</p>
              )}
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white/60">
                {message.body}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-4">
                {message.status !== "read" && (
                  <form action={setMessageStatusAction}>
                    <input type="hidden" name="id" value={message.id} />
                    <input type="hidden" name="status" value="read" />
                    <SubmitButton variant="ghost" size="sm">
                      <MailOpen />
                      Mark read
                    </SubmitButton>
                  </form>
                )}

                {message.status !== "archived" && (
                  <form action={setMessageStatusAction}>
                    <input type="hidden" name="id" value={message.id} />
                    <input type="hidden" name="status" value="archived" />
                    <SubmitButton variant="ghost" size="sm">
                      <Archive />
                      Archive
                    </SubmitButton>
                  </form>
                )}

                <form action={deleteMessageAction} className="ml-auto">
                  <input type="hidden" name="id" value={message.id} />
                  <ConfirmSubmit
                    message="Delete this message permanently?"
                    title="Delete"
                    className="text-white/40 hover:text-red-300"
                  >
                    <Trash2 />
                  </ConfirmSubmit>
                </form>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
