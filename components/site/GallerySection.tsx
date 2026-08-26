"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

import { Editable } from "@/components/editor/Editable";
import { useEditor } from "@/components/editor/EditorProvider";
import { sectionConfig, type PublicPhoto, type PublicSection } from "@/lib/types";

/**
 * Photos and graphics in a masonry grid.
 *
 * True masonry via CSS columns would reorder items down each column, which
 * fights the ordering editors set in the admin. This uses a grid with dense
 * packing and per-item row spans instead: reading order stays left-to-right,
 * and each shot keeps its own proportions.
 */
const ROW_SPAN: Record<string, string> = {
  tall: "row-span-2 aspect-[9/16]",
  portrait: "row-span-2 aspect-[2/3]",
  square: "row-span-1 aspect-square",
  landscape: "row-span-1 aspect-[3/2]",
  wide: "row-span-1 aspect-[16/9]",
};

const COLUMN_CLASSES: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 md:grid-cols-3",
  4: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
};

export function GallerySection({
  section,
  photos,
}: {
  section: PublicSection;
  photos: PublicPhoto[];
}) {
  const { editing } = useEditor();
  const config = sectionConfig(section);
  const [lightbox, setLightbox] = useState<PublicPhoto | null>(null);

  useEffect(() => {
    if (!lightbox) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [lightbox]);

  if (photos.length === 0 && !editing) return null;

  const columns = COLUMN_CLASSES[config.columns ?? 3] ?? COLUMN_CLASSES[3];

  return (
    <section
      className="py-24"
      style={{ backgroundColor: config.background || "#0a0a0a" }}
    >
      {(editing || section.title || section.subtitle) && (
        <div className="mb-14 px-8 md:px-20 lg:px-32">
          <div className="mx-auto flex max-w-[1100px] items-end justify-between border-b border-white/10 pb-5">
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
          </div>
        </div>
      )}

      <div className="px-8 md:px-20 lg:px-32">
        {photos.length === 0 ? (
          <div className="mx-auto max-w-[1100px] rounded-lg border border-dashed border-white/15 px-6 py-16 text-center">
            <p className="text-sm text-white/60">No photos yet</p>
            <p className="mt-2 text-xs text-white/35">
              Add them under Admin → Photos. This band stays hidden from visitors until then.
            </p>
          </div>
        ) : (
          <div className={`mx-auto grid max-w-[1100px] auto-rows-[minmax(0,1fr)] gap-3 ${columns}`}>
            {photos.map((photo, index) => (
              <motion.button
                key={photo.id}
                type="button"
                onClick={() => setLightbox(photo)}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.55, delay: Math.min(index, 8) * 0.04 }}
                className={`group relative overflow-hidden rounded-sm bg-neutral-900 ${
                  ROW_SPAN[photo.aspect] ?? ROW_SPAN.portrait
                }`}
                aria-label={photo.alt || photo.caption || "Open photo"}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.alt}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover opacity-80 transition-all duration-500 group-hover:scale-[1.04] group-hover:opacity-100"
                />
                {config.showCaptions !== false && photo.caption && (
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-8 text-left text-[11px] tracking-wide text-white/85">
                    {photo.caption}
                  </span>
                )}
              </motion.button>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 p-4 backdrop-blur-sm md:p-12"
            onClick={() => setLightbox(null)}
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              onClick={() => setLightbox(null)}
              aria-label="Close photo"
              className="absolute top-6 right-6 text-white/70 transition-colors hover:text-white"
            >
              <X size={30} strokeWidth={1} />
            </button>

            <motion.figure
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="max-h-full"
              onClick={(event) => event.stopPropagation()}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightbox.url}
                alt={lightbox.alt}
                className="max-h-[80vh] w-auto rounded-sm object-contain"
              />
              {lightbox.caption && (
                <figcaption className="mt-4 text-center text-xs tracking-wide text-white/50">
                  {lightbox.caption}
                </figcaption>
              )}
            </motion.figure>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
