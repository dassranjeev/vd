"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

import { Editable } from "@/components/editor/Editable";
import { useEditor } from "@/components/editor/EditorProvider";
import { sectionConfig, type PublicSection, type PublicTestimonial } from "@/lib/types";

const COLUMN_CLASSES: Record<number, string> = {
  1: "grid-cols-1 max-w-2xl",
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
};

function Stars({ rating }: { rating: number }) {
  if (rating <= 0) return null;
  return (
    <div className="mb-5 flex gap-1" aria-label={`${rating} out of 5`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          className={`size-3.5 ${
            index < rating ? "fill-[#c8a97e] text-[#c8a97e]" : "text-white/15"
          }`}
        />
      ))}
    </div>
  );
}

/** Initials stand in when no avatar has been uploaded. */
function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function TestimonialsSection({
  section,
  testimonials,
}: {
  section: PublicSection;
  testimonials: PublicTestimonial[];
}) {
  const { editing } = useEditor();
  const config = sectionConfig(section);

  if (testimonials.length === 0 && !editing) return null;

  const columns = COLUMN_CLASSES[config.columns ?? 3] ?? COLUMN_CLASSES[3];

  return (
    <section className="py-24" style={{ backgroundColor: config.background || "#0a0a0a" }}>
      {(editing || section.title || section.subtitle) && (
        <div className="mb-14 px-8 md:px-20 lg:px-32">
          <div className="mx-auto flex max-w-[1100px] items-end justify-between border-b border-white/10 pb-5">
            <h3 className="text-xs font-medium uppercase tracking-widest text-white/40">
              {section.id ? (
                <Editable
                  value={section.title}
                  target={{ kind: "section", id: section.id, field: "title" }}
                  placeholder="What clients say"
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
        {testimonials.length === 0 ? (
          <div className="mx-auto max-w-[1100px] rounded-lg border border-dashed border-white/15 px-6 py-16 text-center">
            <p className="text-sm text-white/60">No testimonials yet</p>
            <p className="mt-2 text-xs text-white/35">
              Add them under Admin → Testimonials. Hidden from visitors until then.
            </p>
          </div>
        ) : (
          <div className={`mx-auto grid max-w-[1100px] gap-5 ${columns}`}>
            {testimonials.map((item, index) => (
              <motion.figure
                key={item.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: Math.min(index, 5) * 0.08 }}
                className="flex h-full flex-col rounded-sm border border-white/[0.08] bg-white/[0.02] p-7 transition-colors duration-500 hover:border-white/20"
              >
                <Stars rating={item.rating} />

                <blockquote
                  className="flex-1 text-[15px] leading-relaxed text-white/70"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  <span
                    aria-hidden="true"
                    className="mr-1 text-2xl leading-none text-[#c8a97e]/60"
                    style={{ fontFamily: "Georgia, serif" }}
                  >
                    &ldquo;
                  </span>
                  {item.quote}
                </blockquote>

                <figcaption className="mt-6 flex items-center gap-3 border-t border-white/[0.07] pt-5">
                  {item.avatarUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={item.avatarUrl}
                      alt={item.author}
                      loading="lazy"
                      className="size-9 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="grid size-9 shrink-0 place-items-center rounded-full border border-white/15 bg-white/[0.04] text-[11px] font-medium tracking-wide text-white/60">
                      {initials(item.author)}
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-white/85">{item.author}</span>
                    {(item.role || item.company) && (
                      <span className="block truncate text-[11px] uppercase tracking-[0.14em] text-white/35">
                        {[item.role, item.company].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </span>
                </figcaption>
              </motion.figure>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
