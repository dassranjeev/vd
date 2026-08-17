import { PageHeader } from "@/components/admin/ui";
import { VideoForm } from "@/components/admin/VideoForm";
import { requireSession } from "@/lib/auth";

export default async function NewVideoPage() {
  await requireSession();

  return (
    <>
      <PageHeader
        title="Add video"
        description="Paste a YouTube link and choose where it belongs on the page."
      />
      <VideoForm />
    </>
  );
}
