"use client";

import { upload } from "@vercel/blob/client";

import { recordUploadedMediaAction } from "@/lib/actions/media";
import { MEDIA_PREFIX, proxyUrlFor } from "@/lib/blob-proxy";

/**
 * Uploads a file straight from the browser to Vercel Blob, then records it in
 * the media library.
 *
 * Going direct is what keeps large files working: a serverless function can
 * only accept a 4.5 MB request body, so routing the bytes through one meant
 * anything bigger failed with a 413. Here the function only mints a token.
 */
export type UploadResult = { ok: true; url: string } | { ok: false; error: string };

export async function uploadToBlob(
  file: File,
  onProgress?: (percentage: number) => void,
): Promise<UploadResult> {
  try {
    const blob = await upload(`${MEDIA_PREFIX}${file.name}`, file, {
      // The store is private, so this is the only access it accepts. The bytes
      // reach visitors through /api/media/** instead of straight from the CDN.
      access: "private",
      handleUploadUrl: "/api/admin/upload",
      // Large files are split into parts, so a dropped chunk doesn't restart
      // the whole transfer.
      multipart: file.size > 8 * 1024 * 1024,
      onUploadProgress: onProgress
        ? ({ percentage }) => onProgress(Math.round(percentage))
        : undefined,
    });

    // What every consumer stores and renders is the proxy URL: a private blob
    // URL 403s for visitors, so it is useless in an <img src>.
    const url = proxyUrlFor(blob.pathname);
    if (!url) {
      return { ok: false, error: "That upload landed outside the media folder." };
    }

    const recorded = await recordUploadedMediaAction({
      url,
      pathname: blob.pathname,
      filename: file.name,
      contentType: file.type || blob.contentType || "",
      size: file.size,
    });

    // The bytes are safely stored even if the library row fails, so surface the
    // URL rather than losing the upload.
    if (!recorded.ok) return { ok: true, url };
    return { ok: true, url };
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error);

    // The SDK surfaces token-endpoint failures as a generic message, which
    // tells an editor nothing. Name the causes they can actually act on.
    if (/Blob store|501/i.test(raw)) {
      return {
        ok: false,
        error:
          "Uploads need a Vercel Blob store. Add one under Storage in the Vercel dashboard and redeploy, or paste an image URL instead.",
      };
    }
    if (/not signed in|401|unauthor/i.test(raw)) {
      return { ok: false, error: "Your session expired. Reload the page and sign in again." };
    }
    if (/content type|allowed/i.test(raw)) {
      return { ok: false, error: `That file type is not accepted. ${raw}` };
    }
    if (/size|too large|413/i.test(raw)) {
      return { ok: false, error: "That file is too large." };
    }

    return { ok: false, error: raw || "Upload failed." };
  }
}
