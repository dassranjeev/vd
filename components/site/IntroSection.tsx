"use client";

import { motion } from "framer-motion";

import { Editable } from "@/components/editor/Editable";
import { useEditor } from "@/components/editor/EditorProvider";
import { sectionConfig, type PublicSection } from "@/lib/types";

/**
 * About Us / Intro: an eyebrow, a headline, a couple of paragraphs, an optional
 * portrait and an optional call to action.
 *
 * Everything lives in the section's own config rather than a settings group, so
 * the page can carry more than one of these if the story needs it. Body copy is
 * split on blank lines and rendered as plain paragraphs — never as HTML.
 */
export function IntroSection({ section }: { section: PublicSection }) {
  const { editing } = useEditor();
  const config = sectionConfig(section);

  const paragraphs = (config.body ?? "")
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  const hasContent = Boolean(config.heading || paragraphs.length > 0 || config.imageUrl);
  if (!hasContent && !editing) return null;

  const imageFirst = config.imageSide === "left";

  return (
    <section
      className="px-6 py-24 md:px-12 md:py-32"
      style={config.background ? { backgroundColor: config.background } : undefined}
    >
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className={`mx-auto grid max-w-[1100px] items-center gap-12 ${
          config.imageUrl || editing ? "lg:grid-cols-2 lg:gap-16" : "max-w-3xl"
        }`}
      >
        <div className={imageFirst ? "lg:order-2" : undefined}>
          {(editing || config.eyebrow) && (
            <p className="mb-5 text-[10px] uppercase tracking-[0.32em] text-[#c8a97e]">
              {section.id ? (
                <Editable
                  value={config.eyebrow ?? ""}
                  target={{ kind: "section", id: section.id, field: "eyebrow" }}
                  placeholder="Eyebrow"
                />
              ) : (
                config.eyebrow
              )}
            </p>
          )}

          {(editing || config.heading) && (
            <h2
              className="text-3xl font-bold leading-[1.1] tracking-tight text-white md:text-4xl lg:text-[2.9rem]"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              {section.id ? (
                <Editable
                  value={config.heading ?? ""}
                  target={{ kind: "section", id: section.id, field: "heading" }}
                  placeholder="Section heading"
                />
              ) : (
                config.heading
              )}
            </h2>
          )}

          <div
            className="mt-6 h-px w-16"
            style={{ background: "linear-gradient(to right, #c8a97e, transparent)" }}
          />

          {/* Edited as one block so paragraph breaks stay meaningful. */}
          {section.id && editing ? (
            <div className="mt-7">
              <Editable
                value={config.body ?? ""}
                target={{ kind: "section", id: section.id, field: "body" }}
                multiline
                placeholder="Tell the story. Leave a blank line between paragraphs."
                className="text-base leading-relaxed text-white/55 md:text-[17px]"
              />
            </div>
          ) : (
            paragraphs.map((paragraph, index) => (
              <p
                key={index}
                className="mt-6 text-base leading-relaxed text-white/55 md:text-[17px]"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {paragraph}
              </p>
            ))
          )}

          {config.ctaLabel && config.ctaHref && (
            <a
              href={config.ctaHref}
              className="group relative mt-10 inline-block overflow-hidden rounded-full border border-white/20 px-6 py-3.5"
            >
              <span className="relative z-20 text-xs font-medium uppercase tracking-widest text-white/80 transition-colors duration-500 group-hover:text-black">
                {config.ctaLabel}
              </span>
              <span className="absolute inset-0 translate-y-[101%] bg-white transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-0" />
            </a>
          )}
        </div>

        {(config.imageUrl || editing) && (
          <div className={imageFirst ? "lg:order-1" : undefined}>
            {config.imageUrl ? (
              <div className="relative overflow-hidden rounded-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={config.imageUrl}
                  alt={config.heading ?? ""}
                  loading="lazy"
                  className="aspect-[4/5] w-full object-cover"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              </div>
            ) : (
              <div className="grid aspect-[4/5] w-full place-items-center rounded-sm border border-dashed border-white/15 px-6 text-center">
                <p className="text-xs leading-relaxed text-white/35">
                  Add a portrait under
                  <br />
                  Sections → {section.title || "this section"} → Image
                </p>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </section>
  );
}
