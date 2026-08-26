"use client";

import { motion } from "framer-motion";
import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";

import { Editable } from "@/components/editor/Editable";
import { useEditor } from "@/components/editor/EditorProvider";
import { SortableVideos } from "@/components/editor/SortableVideosLoader";
import { sectionConfig, type PublicSection, type PublicVideo } from "@/lib/types";

import { VideoMarquee } from "./VideoMarquee";
import { VideoThumb } from "./VideoThumb";
import { useVideoModal } from "./VideoModalProvider";

const COLUMN_CLASSES: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};


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
        <VideoThumb
          youtubeId={video.youtubeId}
          orientation={video.orientation}
          thumbnailUrl={video.thumbnailUrl}
          alt={video.title}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 group-hover:opacity-100 ${
            vertical ? "opacity-70" : "opacity-75"
          }`}
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

  const total = videos.length;

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
        <VideoMarquee
          videos={videos}
          durationSeconds={duration}
          wheelScroll={config.wheelScroll !== false}
          renderCard={(video) => (
            <VideoCard video={video} vertical onOpen={() => openVideo(video.youtubeId)} />
          )}
        />
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
