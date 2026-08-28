"use client";

import { AlertCircle, Loader2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { buttonClass, Input } from "./ui";
import { uploadToBlob } from "./upload-client";

/**
 * Asks once whether this deployment can accept uploads, and shares the answer
 * across every MediaInput on the page rather than one request each.
 */
let capability: Promise<boolean> | null = null;

function canUploadHere(): Promise<boolean> {
  if (!capability) {
    capability = fetch("/api/admin/session", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { blobEnabled?: boolean } | null) => Boolean(data?.blobEnabled))
      .catch(() => false);
  }
  return capability;
}

/**
 * A URL field with an inline uploader.
 *
 * Typing a path or pasting any URL always works. Uploading needs a Vercel Blob
 * store, which not every deployment has — so the button says so before it is
 * pressed instead of only failing afterwards.
 */
export function MediaInput({
  name,
  defaultValue = "",
  accept = "image/*,video/*",
  placeholder = "/hero.mp4 or https://…",
  id,
}: {
  name: string;
  defaultValue?: string;
  accept?: string;
  placeholder?: string;
  id?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  // null while the capability check is still in flight.
  const [uploadable, setUploadable] = useState<boolean | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    canUploadHere().then((ok) => {
      if (!cancelled) setUploadable(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setError(null);
    setProgress(0);

    const result = await uploadToBlob(file, setProgress);

    setBusy(false);
    setProgress(null);
    if (fileRef.current) fileRef.current.value = "";

    if (result.ok) setValue(result.url);
    else setError(result.error);
  }

  const isVideo = /\.(mp4|webm|mov|m4v)(\?|$)/i.test(value);
  const isImage = /\.(png|jpe?g|gif|webp|avif|svg|heic|heif|bmp|tiff?)(\?|$)/i.test(value);
  const blocked = uploadable === false;

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          id={id}
          name={name}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy || blocked}
          className={buttonClass("secondary", "md", "shrink-0")}
          title={
            blocked
              ? "Uploads need a Vercel Blob store. Paste a URL instead, or connect one under Storage in the Vercel dashboard."
              : "Upload a file to the media library"
          }
        >
          {busy ? <Loader2 className="animate-spin" /> : <Upload />}
          <span className="hidden sm:inline">
            {busy ? (progress === null ? "Uploading…" : `${progress}%`) : "Upload"}
          </span>
        </button>
      </div>

      <input ref={fileRef} type="file" accept={accept} hidden onChange={onFileChange} />

      {blocked && (
        <p className="flex items-start gap-1.5 text-xs text-amber-300/80">
          <AlertCircle className="mt-0.5 size-3 shrink-0" />
          <span>
            Uploads are off: this deployment has no Blob store. Add one under Storage in the Vercel
            dashboard and redeploy, or paste an image URL above.
          </span>
        </p>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      {value && (isImage || isVideo) && (
        <div className="overflow-hidden rounded-md border border-white/[0.08] bg-black/40 p-2">
          {isVideo ? (
            <video src={value} muted playsInline className="max-h-32 rounded" />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={value} alt="" className="max-h-32 rounded object-contain" />
          )}
        </div>
      )}
    </div>
  );
}
