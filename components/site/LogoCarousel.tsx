"use client";

import { useEffect, useRef } from "react";

import { Editable } from "@/components/editor/Editable";
import { useEditor } from "@/components/editor/EditorProvider";
import { sectionConfig, type PublicLogo, type PublicSection } from "@/lib/types";

/**
 * Client logo carousel.
 *
 * Same scroller mechanics as the video reel — a real overflow-x container with
 * the auto-scroll advancing scrollLeft — so it can be dragged and swiped rather
 * than only watched. Deliberately not a CSS transform animation: that was the
 * bug that made the video reel unscrollable on touch.
 */
export function LogoCarousel({
  section,
  logos,
}: {
  section: PublicSection;
  logos: PublicLogo[];
}) {
  const { editing } = useEditor();
  const config = sectionConfig(section);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const hoverPausedRef = useRef(false);
  const touchPausedRef = useRef(false);
  const resumeTimerRef = useRef<number | null>(null);

  const duration = Math.max(5, config.autoScrollSeconds ?? 30);
  const enoughToLoop = logos.length > 2;

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !enoughToLoop) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const delta = (now - last) / 1000;
      last = now;

      const half = el.scrollWidth / 2;
      if (half > 0) {
        if (!reduced && !hoverPausedRef.current && !touchPausedRef.current) {
          el.scrollLeft += (half / duration) * delta;
        }
        if (el.scrollLeft >= half) el.scrollLeft -= half;
        else if (el.scrollLeft < 0) el.scrollLeft += half;
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      if (resumeTimerRef.current !== null) window.clearTimeout(resumeTimerRef.current);
    };
  }, [duration, enoughToLoop]);

  function onTouchStart() {
    touchPausedRef.current = true;
    if (resumeTimerRef.current !== null) {
      window.clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  }

  function onTouchEnd() {
    if (resumeTimerRef.current !== null) window.clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = window.setTimeout(() => {
      touchPausedRef.current = false;
      resumeTimerRef.current = null;
    }, 2500);
  }

  if (logos.length === 0 && !editing) return null;

  // Doubled only when there is enough to make a loop worthwhile.
  const rendered = enoughToLoop ? [...logos, ...logos] : logos;

  return (
    <section className="py-20" style={{ backgroundColor: config.background || "#000000" }}>
      {(editing || section.title) && (
        <div className="mb-10 px-8 text-center md:px-20">
          <h3 className="text-[10px] uppercase tracking-[0.32em] text-white/35">
            {section.id ? (
              <Editable
                value={section.title}
                target={{ kind: "section", id: section.id, field: "title" }}
                placeholder="Trusted by"
              />
            ) : (
              section.title
            )}
          </h3>
        </div>
      )}

      {logos.length === 0 ? (
        <div className="mx-auto max-w-lg rounded-lg border border-dashed border-white/15 px-6 py-12 text-center">
          <p className="text-sm text-white/60">No client logos yet</p>
          <p className="mt-2 text-xs text-white/35">
            Add them under Admin → Clients. Hidden from visitors until then.
          </p>
        </div>
      ) : (
        <div
          ref={scrollerRef}
          className="vd-reel scrollbar-hide overflow-x-auto overflow-y-hidden"
          onPointerEnter={(event) => {
            if (event.pointerType === "mouse") hoverPausedRef.current = true;
          }}
          onPointerLeave={(event) => {
            if (event.pointerType === "mouse") hoverPausedRef.current = false;
          }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchEnd}
          role="group"
          aria-label="Client logos"
        >
          <div
            className={`flex w-max items-center gap-14 px-8 ${
              enoughToLoop ? "" : "mx-auto justify-center"
            }`}
          >
            {rendered.map((logo, index) => {
              const image = logo.imageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={logo.imageUrl}
                  alt={logo.name}
                  loading="lazy"
                  className={`h-10 w-auto max-w-[160px] object-contain transition-all duration-500 ${
                    config.grayscale === false
                      ? "opacity-80 hover:opacity-100"
                      : "opacity-45 grayscale hover:opacity-100 hover:grayscale-0"
                  }`}
                />
              ) : (
                // No mark supplied: set the name instead of showing a gap.
                <span className="whitespace-nowrap text-sm tracking-[0.18em] text-white/40 uppercase transition-colors duration-500 hover:text-white/80">
                  {logo.name}
                </span>
              );

              return (
                <div key={`${logo.id}-${index}`} className="flex-shrink-0">
                  {logo.url ? (
                    <a
                      href={logo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={logo.name}
                      className="block"
                    >
                      {image}
                    </a>
                  ) : (
                    image
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
