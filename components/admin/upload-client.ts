"use client";

import { upload } from "@vercel/blob/client";

import { recordUploadedMediaAction } from "@/lib/actions/media";

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
    const blob = await upload(`media/${file.name}`, file, {
      access: "public",
      handleUploadUrl: "/api/admin/upload",
      // Large files are split into parts, so a dropped chunk doesn't restart
      // the whole transfer.
      multipart: file.size > 8 * 1024 * 1024,
      onUploadProgress: onProgress
        ? ({ percentage }) => onProgress(Math.round(percentage))
        : undefined,
    });

    const recorded = await recordUploadedMediaAction({
      url: blob.url,
      pathname: blob.pathname,
      filename: file.name,
      contentType: file.type || blob.contentType || "",
      size: file.size,
    });

    // The bytes are safely stored even if the library row fails, so surface the
    // URL rather than losing the upload.
    if (!recorded.ok) {
      return { ok: true, url: blob.url };
    }
    return { ok: true, url: blob.url };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    return { ok: false, error: message };
  }
}
