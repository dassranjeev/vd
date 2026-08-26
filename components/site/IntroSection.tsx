"use client";

import { motion } from "framer-motion";

import { Editable } from "@/components/editor/Editable";
import { useEditor } from "@/components/editor/EditorProvider";
import type { SettingsShape } from "@/lib/settings";
import { sectionConfig, type PublicSection } from "@/lib/types";

import { AboutStatement } from "./AboutStatement";

/**
 * About Us / Intro: an eyebrow, a headline, prose, an optional call to action,
 * and a second column that can hold either a portrait or the About statement.
 *
 * The statement option is why this exists as two columns: the intro copy and
 * the "What it conveys" block say related things and read better side by side
 * than stacked as two separate full-width bands.
 *
 * Copy lives in the section's own config rather than a settings group, so a
 * page can carry more than one intro if the story needs it. Body text is split
 * on blank lines and rendered as plain paragraphs — never as HTML.
 */
export function IntroSection({
  section,
  about,
}: {
  section: PublicSection;
  about: SettingsShape["about"];
}) {
  const { editing } = useEditor();
  const config = sectionConfig(section);

  const paragraphs = (config.body ?? "")
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  // Legacy rows predate this option: fall back to the image behaviour they had.
  const second = config.secondColumn ?? (config.imageUrl ? "image" : "none");
  const showStatement = second === "statement";
  const showImage = second === "image";
  const twoColumns = showStatement || showImage || editing;

  const hasContent = Boolean(config.heading || paragraphs.length > 0 || showStatement || config.imageUrl);
  if (!hasContent && !editing) return null;

  const imageFirst = config.imageSide === "left";

  return (
    <section
      className="relative overflow-hidden px-6 py-24 md:px-12 md:py-32"
      style={config.background ? { backgroundColor: config.background } : undefined}
    >
      {/* Soft warm wash, echoing the hero's light leaks. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 85% 15%, rgba(200,169,126,0.07) 0%, transparent 70%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className={`relative mx-auto grid max-w-[1100px] gap-12 ${
          twoColumns ? "lg:grid-cols-2 lg:items-center lg:gap-16" : "max-w-3xl"
        }`}
      >
        {/* ── Left: the intro copy ── */}
        <div className={imageFirst && showImage ? "lg:order-2" : undefined}>
          {(editing || config.eyebrow) && (
            <p className="mb-5 flex items-center gap-3 text-[10px] uppercase tracking-[0.32em] text-[#c8a97e]">
              <span aria-hidden="true" className="h-px w-6 bg-[#c8a97e]/60" />
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
              className="text-[1.9rem] font-bold leading-[1.08] tracking-[-0.02em] text-white sm:text-4xl lg:text-[2.75rem]"
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
                className="mt-6 text-[15px] leading-[1.75] text-white/55 md:text-base"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {paragraph}
              </p>
            ))
          )}

          {config.ctaLabel && config.ctaHref && (
            <a
              href={config.ctaHref}
              className="group relative mt-9 inline-block overflow-hidden rounded-full border border-white/20 px-6 py-3.5"
            >
              <span className="relative z-20 text-xs font-medium uppercase tracking-widest text-white/80 transition-colors duration-500 group-hover:text-black">
                {config.ctaLabel}
              </span>
              <span className="absolute inset-0 translate-y-[101%] bg-white transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-0" />
            </a>
          )}
        </div>

        {/* ── Right: statement, portrait, or an editor prompt ── */}
        {showStatement && (
          <div className="lg:border-l lg:border-white/[0.07] lg:pl-16">
            <AboutStatement about={about} variant="panel" />
          </div>
        )}

        {showImage && (
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
                  Add a portrait under Sections → {section.title || "this section"}
                </p>
              </div>
            )}
          </div>
        )}

        {editing && second === "none" && (
          <div className="grid min-h-[220px] place-items-center rounded-sm border border-dashed border-white/15 px-6 text-center">
            <p className="text-xs leading-relaxed text-white/35">
              Second column is off.
              <br />
              Choose a portrait or the About statement in Sections.
            </p>
          </div>
        )}
      </motion.div>
    </section>
  );
}
