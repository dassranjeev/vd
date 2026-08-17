import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/admin/ui";
import { VideoForm } from "@/components/admin/VideoForm";
import { requireSession } from "@/lib/auth";
import { getDb, videos } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EditVideoPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;

  // A bad id would otherwise reach Postgres as an invalid uuid and throw.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();

  const [video] = await getDb().select().from(videos).where(eq(videos.id, id)).limit(1);
  if (!video) notFound();

  return (
    <>
      <PageHeader title="Edit video" description={`Last updated ${formatDate(video.updatedAt)}.`} />
      <VideoForm video={video} />
    </>
  );
}
