"use client";

import { Copy, Loader2, Trash2, Upload } from "lucide-react";
import { useActionState, useRef, useState } from "react";

import { addExternalMediaAction, deleteMediaAction } from "@/lib/actions/media";
import { idleState } from "@/lib/actions/types";
import type { MediaItem } from "@/lib/db";
import { formatBytes, relativeTime } from "@/lib/utils";

import { ConfirmSubmit, FormFeedback, SubmitButton } from "./form";
import { Badge, buttonClass, Card, CardHeader, EmptyState, Field, Input, Notice } from "./ui";

function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          setCopied(false);
        }
      }}
      className={buttonClass("ghost", "sm", "gap-1.5")}
      title="Copy URL"
    >
      <Copy />
      {copied ? "Copied" : "Copy URL"}
    </button>
  );
}

function Uploader({ enabled }: { enabled: boolean }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setMessage(null);

    let uploaded = 0;
    let lastError = "";

    for (const file of Array.from(files)) {
      const body = new FormData();
      body.append("file", file);
      try {
        const response = await fetch("/api/admin/upload", { method: "POST", body });
        const payload = (await response.json()) as { ok?: boolean; error?: string };
        if (response.ok && payload.ok) uploaded += 1;
        else lastError = payload.error ?? "Upload failed.";
      } catch {
        lastError = "Network error during upload.";
      }
    }

    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";

    if (uploaded > 0) {
      setMessage({ ok: true, text: `Uploaded ${uploaded} file(s). Refreshing…` });
      // The list is a server component; a reload is the simplest way to refresh.
      window.location.reload();
    } else {
      setMessage({ ok: false, text: lastError || "Nothing was uploaded." });
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy || !enabled}
        className={buttonClass("primary", "md")}
      >
        {busy ? <Loader2 className="animate-spin" /> : <Upload />}
        {busy ? "Uploading…" : "Upload files"}
      </button>

      <input
        ref={fileRef}
        type="file"
        multiple
        accept="image/*,video/*"
        hidden
        onChange={(event) => upload(event.target.files)}
      />

      {message && (
        <p className={message.ok ? "text-xs text-emerald-300" : "text-xs text-red-400"}>
          {message.text}
        </p>
      )}
    </div>
  );
}

export function MediaManager({ items, blobEnabled }: { items: MediaItem[]; blobEnabled: boolean }) {
  const [state, action] = useActionState(addExternalMediaAction, idleState);

  return (
    <div className="space-y-6">
      {!blobEnabled && (
        <Notice tone="info" title="No Blob store connected">
          <p>
            Uploads need a Vercel Blob store — create one under Storage → Blob in your Vercel project
            and redeploy. Until then you can still register assets by URL, including files committed to{" "}
            <code className="text-white">/public</code>.
          </p>
        </Notice>
      )}

      <Card>
        <CardHeader
          title="Upload"
          description="Images and video up to 100 MB each. Uploaded files get a permanent CDN URL."
          action={<Uploader enabled={blobEnabled} />}
        />

        <form action={action} className="grid gap-4 border-t border-white/[0.06] pt-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field label="Or add by URL" htmlFor="media-url" error={state.fieldErrors?.url}>
            <Input id="media-url" name="url" placeholder="/hero.mp4" required />
          </Field>
          <Field label="Description" htmlFor="media-alt" help="Used as alt text where applicable.">
            <Input id="media-alt" name="alt" placeholder="Hero reel" />
          </Field>
          <SubmitButton pendingLabel="Adding…">Add</SubmitButton>
        </form>

        <FormFeedback state={state} className="mt-4" />
      </Card>

      <Card>
        <CardHeader title="Library" description={`${items.length} asset(s).`} />

        {items.length === 0 ? (
          <EmptyState
            title="Nothing in the library"
            description="Upload a file or register one by URL to see it here."
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const isVideo = item.contentType.startsWith("video/") || /\.(mp4|webm|mov)$/i.test(item.url);

              return (
                <li
                  key={item.id}
                  className="overflow-hidden rounded-lg border border-white/[0.08] bg-black/30"
                >
                  <div className="grid h-36 place-items-center bg-black/60">
                    {isVideo ? (
                      <video src={item.url} muted playsInline className="h-full w-full object-contain" />
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={item.url}
                        alt={item.alt}
                        className="h-full w-full object-contain"
                        loading="lazy"
                      />
                    )}
                  </div>

                  <div className="space-y-2 p-3">
                    <p className="truncate text-sm text-white/85" title={item.filename}>
                      {item.filename}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={item.source === "blob" ? "success" : "neutral"}>{item.source}</Badge>
                      {item.size > 0 && <Badge>{formatBytes(item.size)}</Badge>}
                      <span className="text-[10px] text-white/30">{relativeTime(item.createdAt)}</span>
                    </div>

                    <div className="flex items-center justify-between gap-1 pt-1">
                      <CopyButton url={item.url} />
                      <form action={deleteMediaAction}>
                        <input type="hidden" name="id" value={item.id} />
                        <ConfirmSubmit
                          message={`Delete ${item.filename}? Anything still pointing at this URL will break.`}
                          title="Delete"
                          className="text-white/40 hover:text-red-300"
                        >
                          <Trash2 />
                        </ConfirmSubmit>
                      </form>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
