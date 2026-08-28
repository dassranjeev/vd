"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * A video thumbnail that resolves to the best image YouTube actually has.
 *
 * YouTube does not serve every derivative for every video, and the sizes are
 * not interchangeable:
 *
 *   maxresdefault  1280x720, true 16:9 — only exists if uploaded in HD
 *   sddefault       640x480, 4:3 with letterbox bars
 *   hqdefault       480x360, 4:3 with letterbox bars
 *   mqdefault       320x180, true 16:9
 *   oardefault      original aspect ratio — the tall frame for a Short
 *
 * So the list is ordered by resolution, with the correct-aspect frame first for
 * vertical cards, and walked until one loads. hqdefault is kept near the end as
 * the guaranteed backstop.
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
      ? // Tall frame first so a Short fills a 9:16 card rather than sitting in bars.
        [
          `${base}/oardefault.jpg`,
          `${base}/maxresdefault.jpg`,
          `${base}/sddefault.jpg`,
          `${base}/hqdefault.jpg`,
          `${base}/mqdefault.jpg`,
        ]
      : [
          `${base}/maxresdefault.jpg`,
          `${base}/sddefault.jpg`,
          `${base}/hqdefault.jpg`,
          `${base}/mqdefault.jpg`,
        ];

  // A custom thumbnail wins, but YouTube still backs it up if it 404s.
  return thumbnailUrl ? [thumbnailUrl, ...youtube] : youtube;
}

/**
 * YouTube answers some missing derivatives with a 120x90 grey placeholder and
 * HTTP 200 rather than a 404, so onError never fires. Anything that small is
 * treated as a miss.
 */
const PLACEHOLDER_MAX_EDGE = 121;

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

  const next = () => setIndex((current) => current + 1);

  if (index >= candidates.length) {
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
      src={candidates[index]}
      alt={alt}
      loading={loading}
      className={className}
      onError={next}
      onLoad={(event) => {
        const img = event.currentTarget;
        const isPlaceholder =
          img.naturalWidth > 0 &&
          img.naturalWidth < PLACEHOLDER_MAX_EDGE &&
          img.naturalHeight < PLACEHOLDER_MAX_EDGE;
        // Only fall through if there is something better left to try.
        if (isPlaceholder && index < candidates.length - 1) next();
      }}
    />
  );
}
