import { asc } from "drizzle-orm";
import { ChevronDown, ChevronUp, Pencil, Plus, Star, Trash2 } from "lucide-react";
import Link from "next/link";

import { BulkImport } from "@/components/admin/BulkImport";
import { ConfirmSubmit, SubmitButton } from "@/components/admin/form";
import { Badge, ButtonLink, Card, EmptyState, Notice, PageHeader } from "@/components/admin/ui";
import {
  deleteVideoAction,
  moveVideoAction,
  toggleVideoFeaturedAction,
  toggleVideoPublishedAction,
} from "@/lib/actions/videos";
import { requireSession } from "@/lib/auth";
import { getDb, isDatabaseConfigured, videos as videosTable } from "@/lib/db";
import { VideoThumb } from "@/components/site/VideoThumb";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Row = typeof videosTable.$inferSelect;

async function loadVideos(): Promise<{ rows: Row[]; error?: string }> {
  if (!isDatabaseConfigured) return { rows: [], error: "no-database" };
  try {
    const rows = await getDb()
      .select()
      .from(videosTable)
      .orderBy(asc(videosTable.orientation), asc(videosTable.position), asc(videosTable.createdAt));
    return { rows };
  } catch (error) {
    return { rows: [], error: error instanceof Error ? error.message : "unknown" };
  }
}

function VideoRow({ video, isFirst, isLast }: { video: Row; isFirst: boolean; isLast: boolean }) {
  const meta = [video.client, video.year, video.role].filter(Boolean).join(" · ");

  return (
    <li className="flex items-center gap-3 py-3">
      {/* Reorder controls. Positions are kept per orientation. */}
      <div className="flex shrink-0 flex-col gap-0.5">
        <form action={moveVideoAction}>
          <input type="hidden" name="id" value={video.id} />
          <input type="hidden" name="direction" value="up" />
          <SubmitButton variant="ghost" size="icon" disabled={isFirst} title="Move up" className="h-6 w-6">
            <ChevronUp />
          </SubmitButton>
        </form>
        <form action={moveVideoAction}>
          <input type="hidden" name="id" value={video.id} />
          <input type="hidden" name="direction" value="down" />
          <SubmitButton variant="ghost" size="icon" disabled={isLast} title="Move down" className="h-6 w-6">
            <ChevronDown />
          </SubmitButton>
        </form>
      </div>

      <Link href={`/admin/videos/${video.id}`} className="shrink-0">
        <VideoThumb
          youtubeId={video.youtubeId}
          orientation={video.orientation}
          thumbnailUrl={video.thumbnailUrl}
          alt=""
          className={cn(
            "rounded border border-white/[0.08] bg-black object-cover",
            video.orientation === "vertical" ? "h-16 w-9" : "h-11 w-20",
          )}
        />
      </Link>

      <div className="min-w-0 flex-1">
        <Link
          href={`/admin/videos/${video.id}`}
          className="block truncate text-sm font-medium text-white/90 transition-colors hover:text-white"
        >
          {video.title}
        </Link>
        <p className="mt-0.5 truncate text-xs text-white/35">{meta || video.youtubeId}</p>
      </div>

      <div className="hidden shrink-0 items-center gap-2 sm:flex">
        {video.featured && <Badge tone="warning">Featured</Badge>}
        <Badge tone={video.published ? "success" : "neutral"}>
          {video.published ? "Live" : "Draft"}
        </Badge>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <form action={toggleVideoFeaturedAction}>
          <input type="hidden" name="id" value={video.id} />
          <SubmitButton
            variant="ghost"
            size="icon"
            title={video.featured ? "Remove from featured" : "Mark as featured"}
            className={video.featured ? "text-amber-300" : undefined}
          >
            <Star />
          </SubmitButton>
        </form>

        <form action={toggleVideoPublishedAction}>
          <input type="hidden" name="id" value={video.id} />
          <SubmitButton variant="ghost" size="sm" title="Toggle published">
            {video.published ? "Hide" : "Publish"}
          </SubmitButton>
        </form>

        <Link
          href={`/admin/videos/${video.id}`}
          className="grid size-8 place-items-center rounded-md text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white"
          title="Edit"
        >
          <Pencil className="size-4" />
        </Link>

        <form action={deleteVideoAction}>
          <input type="hidden" name="id" value={video.id} />
          <ConfirmSubmit
            message={`Delete "${video.title}"? This can't be undone.`}
            title="Delete"
            className="text-white/40 hover:text-red-300"
          >
            <Trash2 />
          </ConfirmSubmit>
        </form>
      </div>
    </li>
  );
}

function Group({ title, hint, rows }: { title: string; hint: string; rows: Row[] }) {
  return (
    <Card>
      <div className="mb-3 flex items-end justify-between border-b border-white/[0.06] pb-3">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <span className="text-xs text-white/30">
          {rows.length} {rows.length === 1 ? "video" : "videos"} &middot; {hint}
        </span>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          description={`Add a ${hint} video and it will appear in this band on the homepage.`}
        />
      ) : (
        <ul className="divide-y divide-white/[0.06]">
          {rows.map((video, index) => (
            <VideoRow
              key={video.id}
              video={video}
              isFirst={index === 0}
              isLast={index === rows.length - 1}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}

export default async function VideosPage() {
  await requireSession();
  const { rows, error } = await loadVideos();

  const horizontal = rows.filter((row) => row.orientation === "horizontal");
  const vertical = rows.filter((row) => row.orientation === "vertical");

  return (
    <>
      <PageHeader
        title="Videos"
        description="The reel. Order here is the order on the homepage, so reorder with the arrows."
        action={
          <ButtonLink href="/admin/videos/new" variant="primary">
            <Plus />
            Add video
          </ButtonLink>
        }
      />

      {error && (
        <div className="mb-6">
          <Notice tone="warning" title="Can't load videos">
            {error === "no-database"
              ? "No DATABASE_URL is configured on this deployment."
              : "The database is unreachable or not initialised yet. Run the setup step."}
          </Notice>
        </div>
      )}

      <div className="space-y-6">
        <Group title="Vertical videos" hint="9:16" rows={vertical} />
        <Group title="Horizontal videos" hint="16:9" rows={horizontal} />
        <BulkImport />
      </div>
    </>
  );
}
