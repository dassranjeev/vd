"use client";

import { Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { buttonClass, Input } from "./ui";

/**
 * A URL field with an inline uploader. Typing a path (or pasting any URL) works
 * with no storage configured; the Upload button pushes straight to Vercel Blob
 * and drops the resulting URL into the field.
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
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/admin/upload", { method: "POST", body });
      const payload = (await response.json()) as { ok?: boolean; url?: string; error?: string };

      if (!response.ok || !payload.ok || !payload.url) {
        setError(payload.error ?? "Upload failed.");
        return;
      }
      setValue(payload.url);
    } catch {
      setError("Upload failed — check your connection.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const isVideo = /\.(mp4|webm|mov|m4v)(\?|$)/i.test(value);
  const isImage = /\.(png|jpe?g|gif|webp|avif|svg)(\?|$)/i.test(value);

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
          disabled={busy}
          className={buttonClass("secondary", "md", "shrink-0")}
          title="Upload a file to the media library"
        >
          {busy ? <Loader2 className="animate-spin" /> : <Upload />}
          <span className="hidden sm:inline">{busy ? "Uploading…" : "Upload"}</span>
        </button>
      </div>

      <input ref={fileRef} type="file" accept={accept} hidden onChange={onFileChange} />

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
