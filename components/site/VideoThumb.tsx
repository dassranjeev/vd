"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * A video thumbnail that always resolves to something.
 *
 * YouTube does not serve every derivative for every video: `oardefault` (the
 * original aspect ratio, which is what makes a Short look right in a 9:16 card)
 * is often missing, while `hqdefault` effectively always exists. A custom
 * thumbnail can also point at a file that has since been removed.
 *
 * So rather than one URL and a hand-rolled onError chain — which only the public
 * grid had, leaving broken images in the admin — this walks a candidate list and
 * stops at the first that loads.
 */
export function thumbnailCandidates({
  youtubeId,
  orientation,
  thumbnailUrl,
}: {
  youtubeId: string;
  orientation: string;
  thumbnailUrl?: string;
}): string[] {
  const base = `https://img.youtube.com/vi/${youtubeId}`;

  const youtube =
    orientation === "vertical"
      ? // Tall first so Shorts fill the card, then the always-present 16:9.
        [`${base}/oardefault.jpg`, `${base}/hqdefault.jpg`, `${base}/mqdefault.jpg`]
      : [`${base}/hqdefault.jpg`, `${base}/mqdefault.jpg`];

  // A custom thumbnail wins, but YouTube still backs it up if it 404s.
  return thumbnailUrl ? [thumbnailUrl, ...youtube] : youtube;
}

export function VideoThumb({
  youtubeId,
  orientation,
  thumbnailUrl,
  alt,
  className,
  loading = "lazy",
}: {
  youtubeId: string;
  orientation: string;
  thumbnailUrl?: string;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
}) {
  const candidates = thumbnailCandidates({ youtubeId, orientation, thumbnailUrl });
  const [index, setIndex] = useState(0);

  // Start again when the video (or its custom thumbnail) changes.
  useEffect(() => {
    setIndex(0);
  }, [youtubeId, thumbnailUrl]);

  const src = candidates[Math.min(index, candidates.length - 1)];
  const exhausted = index >= candidates.length;

  if (exhausted) {
    return (
      <span
        className={cn("grid place-items-center bg-neutral-900 text-[10px] text-white/25", className)}
        aria-label={alt}
      >
        No preview
      </span>
    );
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt={alt}
      loading={loading}
      className={className}
      onError={() => setIndex((current) => current + 1)}
    />
  );
}
