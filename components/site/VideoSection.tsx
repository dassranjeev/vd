"use client";

import { motion } from "framer-motion";
import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Editable } from "@/components/editor/Editable";
import { useEditor } from "@/components/editor/EditorProvider";
import { SortableVideos } from "@/components/editor/SortableVideosLoader";
import { sectionConfig, thumbnailFor, type PublicSection, type PublicVideo } from "@/lib/types";

import { useVideoModal } from "./VideoModalProvider";

const COLUMN_CLASSES: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};

/** Falls back through YouTube's thumbnail variants when a custom one 404s. */
function handleThumbnailError(event: React.SyntheticEvent<HTMLImageElement>, youtubeId: string) {
  const img = event.currentTarget;
  if (!img.src.includes("img.youtube.com")) {
    img.src = `https://img.youtube.com/vi/${youtubeId}/oardefault.jpg`;
  } else if (img.src.includes("oardefault")) {
    img.src = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
  }
}

function PlayBadge({ size }: { size: "sm" | "md" }) {
  const box = size === "sm" ? "h-11 w-11" : "h-12 w-12";
  const arrow =
    size === "sm"
      ? "border-t-[5px] border-l-[9px] border-b-[5px]"
      : "border-t-[6px] border-l-[10px] border-b-[6px]";
  return (
    <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
      <div
        className={`${box} flex items-center justify-center rounded-full border border-white/25 bg-black/60 backdrop-blur-sm`}
      >
        <div
          className={`${arrow} ml-0.5 h-0 w-0 border-t-transparent border-l-white border-b-transparent`}
        />
      </div>
    </div>
  );
}

/** Seed fallback rows use synthetic ids and have no admin page to open. */
const isRealId = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

function VideoCard({
  video,
  vertical,
  onOpen,
}: {
  video: PublicVideo;
  vertical: boolean;
  onOpen: () => void;
}) {
  const { editing } = useEditor();
  const router = useRouter();
  const canEdit = editing && isRealId(video.id);

  return (
    <button
      type="button"
      onClick={() => (canEdit ? router.push(`/admin/videos/${video.id}`) : onOpen())}
      aria-label={canEdit ? `Edit ${video.title}` : `Play ${video.title}`}
      className={`group block cursor-pointer text-left transition-transform duration-500 ease-out hover:scale-[1.06] ${
        vertical ? "w-[220px] flex-shrink-0" : "w-full"
      }`}
    >
      <div
        className={`relative overflow-hidden rounded-sm bg-neutral-900 ${
          vertical ? "aspect-[9/16]" : "aspect-video"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbnailFor(video)}
          alt={video.title}
          loading="lazy"
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 group-hover:opacity-100 ${
            vertical ? "opacity-70" : "opacity-75"
          }`}
          onError={(event) => handleThumbnailError(event, video.youtubeId)}
        />

        {canEdit ? (
          <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-black/70 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-white backdrop-blur-sm">
              <Pencil className="size-3" />
              Edit
            </span>
          </span>
        ) : (
          <PlayBadge size={vertical ? "sm" : "md"} />
        )}

        <div className="absolute inset-x-0 bottom-0">
          <div
            className={`bg-gradient-to-t from-black/60 to-transparent ${vertical ? "h-10" : "h-8"}`}
          />
          <div className={`px-3 py-2 backdrop-blur-sm ${vertical ? "bg-black/50" : "bg-black/40"}`}>
            <h4
              className="line-clamp-1 text-sm font-light tracking-wide text-white/90"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              {video.title}
            </h4>
            {(video.client || video.year) && (
              <p className="mt-0.5 line-clamp-1 text-[10px] uppercase tracking-[0.18em] text-white/40">
                {[video.client, video.year].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

export function VideoSection({
  section,
  videos,
}: {
  section: PublicSection;
  videos: PublicVideo[];
}) {
  const { openVideo } = useVideoModal();
  const { editing } = useEditor();
  const config = sectionConfig(section);

  const isMarquee = config.layout === "marquee";
  const vertical = (config.orientation ?? "horizontal") === "vertical";
  const columns = COLUMN_CLASSES[config.columns ?? 3] ?? COLUMN_CLASSES[3];
  const duration = Math.max(5, config.autoScrollSeconds ?? 40);

  // Dot indicator for the marquee. One dot becomes active per equal slice of
  // the loop, matching the CSS animation's pace.
  const [activeDot, setActiveDot] = useState(0);
  const total = videos.length;

  useEffect(() => {
    if (!isMarquee || total === 0) return;
    const stepMs = (duration * 1000) / total;
    const timer = setInterval(() => setActiveDot((prev) => (prev + 1) % total), stepMs);
    return () => clearInterval(timer);
  }, [isMarquee, total, duration]);

  const nudge = useCallback(
    (delta: number) => setActiveDot((prev) => (prev + delta + total) % total),
    [total],
  );

  // Cards can only be reordered when they have real database ids to persist
  // against (seed fallback rows use synthetic ones).
  const sortable = editing && videos.length > 1 && videos.every((video) => isRealId(video.id));

  if (total === 0) return null;

  return (
    <section
      className="py-24"
      style={{ backgroundColor: config.background || (vertical ? "#0a0a0a" : "#000000") }}
    >
      {/* Header */}
      {(editing || section.title || section.subtitle) && (
        <div className="mb-14 px-8 md:px-20 lg:px-32">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mx-auto flex max-w-[1100px] items-end justify-between border-b border-white/10 pb-5"
          >
            <h3 className="text-xs font-medium uppercase tracking-widest text-white/40">
              {section.id ? (
                <Editable
                  value={section.title}
                  target={{ kind: "section", id: section.id, field: "title" }}
                  placeholder="Section heading"
                />
              ) : (
                section.title
              )}
            </h3>
            <span className="text-xs tracking-widest text-white/25">
              {section.id ? (
                <Editable
                  value={section.subtitle}
                  target={{ kind: "section", id: section.id, field: "subtitle" }}
                  placeholder="Meta"
                />
              ) : (
                section.subtitle
              )}
            </span>
          </motion.div>
        </div>
      )}

      {/* In edit mode the whole band becomes a static, drag-sortable grid: an
          animating, duplicated marquee track can't be reordered coherently. */}
      {sortable ? (
        <SortableVideos
          videos={videos}
          orientation={vertical ? "vertical" : "horizontal"}
          vertical={vertical}
          columns={columns}
          renderCard={(video) => (
            <VideoCard video={video} vertical={vertical} onOpen={() => openVideo(video.youtubeId)} />
          )}
        />
      ) : isMarquee ? (
        <>
          <div
            className="marquee-container scrollbar-hide overflow-hidden py-5"
            style={{ touchAction: "pan-y" }}
          >
            {/* The list is rendered twice so the -50% loop is seamless. */}
            <div
              className="marquee-track flex gap-5"
              style={{ ["--marquee-duration" as string]: `${duration}s` }}
            >
              {[...videos, ...videos].map((video, index) => (
                <VideoCard
                  key={`${video.id}-${index}`}
                  video={video}
                  vertical
                  onOpen={() => openVideo(video.youtubeId)}
                />
              ))}
            </div>
          </div>

          <div className="mt-10 flex items-center justify-center gap-8">
            <button
              type="button"
              onClick={() => nudge(-1)}
              aria-label="Previous"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/50 transition-all duration-300 hover:border-white/50 hover:text-white"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path
                  d="M9 2L4 7L9 12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <div className="flex gap-2">
              {videos.map((video, index) => (
                <button
                  key={video.id}
                  type="button"
                  onClick={() => setActiveDot(index)}
                  aria-label={`Go to ${video.title}`}
                  className={`rounded-full transition-all duration-300 ${
                    index === activeDot
                      ? "h-1.5 w-4 bg-white"
                      : "h-1.5 w-1.5 bg-white/25 hover:bg-white/50"
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => nudge(1)}
              aria-label="Next"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/50 transition-all duration-300 hover:border-white/50 hover:text-white"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path
                  d="M5 2L10 7L5 12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </>
      ) : (
        <div className="px-8 md:px-20 lg:px-32">
          <div className={`mx-auto grid max-w-[1100px] gap-4 ${columns}`}>
            {videos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                vertical={vertical}
                onOpen={() => openVideo(video.youtubeId)}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
