"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { PublicVideo } from "@/lib/types";

/**
 * The vertical-video reel: auto-scrolling, but also a real scroll container the
 * visitor can drive by hand.
 *
 * This was previously a CSS `translateX(-50%)` animation. That looks the same
 * but cannot be scrolled, and the arrows and dots only moved an indicator. The
 * strip is now a native `overflow-x` scroller and the auto-scroll advances
 * `scrollLeft` on a rAF loop, so manual and automatic movement share one source
 * of truth.
 *
 * The list is rendered twice; the loop normalises `scrollLeft` around the
 * halfway mark, so it wraps seamlessly in either direction however you got
 * there.
 */
export function VideoMarquee({
  videos,
  durationSeconds,
  renderCard,
}: {
  videos: PublicVideo[];
  durationSeconds: number;
  renderCard: (video: PublicVideo) => React.ReactNode;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const draggingRef = useRef(false);
  const dragMovedRef = useRef(0);
  const dragStartRef = useRef({ x: 0, scroll: 0 });

  const [activeIndex, setActiveIndex] = useState(0);
  const total = videos.length;

  /** Width of one card plus its gap, measured from the DOM. */
  const stepWidth = useCallback(() => {
    const el = scrollerRef.current;
    const track = el?.firstElementChild as HTMLElement | null;
    const first = track?.firstElementChild as HTMLElement | null;
    if (!track || !first) return 240;
    const gap = parseFloat(getComputedStyle(track).columnGap || "20") || 20;
    return first.offsetWidth + gap;
  }, []);

  // Auto-scroll. Paused on hover, focus and drag, and disabled for
  // reduced-motion users, who keep full manual control.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const delta = (now - last) / 1000;
      last = now;

      const half = el.scrollWidth / 2;
      if (half > 0) {
        if (!reduced && !pausedRef.current && !draggingRef.current) {
          el.scrollLeft += (half / Math.max(1, durationSeconds)) * delta;
        }
        // Normalise so the duplicated track loops in both directions.
        if (el.scrollLeft >= half) el.scrollLeft -= half;
        else if (el.scrollLeft < 0) el.scrollLeft += half;
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [durationSeconds]);

  // Keep the dot indicator in step with wherever the strip actually is.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || total === 0) return;

    const onScroll = () => {
      const step = stepWidth();
      if (step <= 0) return;
      setActiveIndex(Math.round(el.scrollLeft / step) % total);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [total, stepWidth]);

  const scrollByCards = useCallback(
    (cards: number) => {
      scrollerRef.current?.scrollBy({ left: cards * stepWidth(), behavior: "smooth" });
    },
    [stepWidth],
  );

  const scrollToIndex = useCallback(
    (index: number) => {
      const el = scrollerRef.current;
      if (!el) return;
      const half = el.scrollWidth / 2 || 1;
      const direct = index * stepWidth() - el.scrollLeft;
      // Travel to whichever copy of the target card is nearer.
      const wrapped = direct - Math.sign(direct) * half;
      const move = Math.abs(wrapped) < Math.abs(direct) ? wrapped : direct;
      el.scrollBy({ left: move, behavior: "smooth" });
    },
    [stepWidth],
  );

  /* ── Click-and-drag with a mouse ────────────────────────────────────────
     Touch and trackpads already scroll this natively, so pointer dragging is
     wired up for mice only: hijacking touch would fight the browser.        */

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    const el = scrollerRef.current;
    if (!el) return;

    draggingRef.current = true;
    dragMovedRef.current = 0;
    dragStartRef.current = { x: event.clientX, scroll: el.scrollLeft };
    el.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    const el = scrollerRef.current;
    if (!el) return;

    const dx = event.clientX - dragStartRef.current.x;
    dragMovedRef.current = Math.max(dragMovedRef.current, Math.abs(dx));
    el.scrollLeft = dragStartRef.current.scroll - dx;
  }

  function endDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    scrollerRef.current?.releasePointerCapture(event.pointerId);
  }

  // A drag of more than a few pixels should not also open the lightbox.
  function onClickCapture(event: React.MouseEvent<HTMLDivElement>) {
    if (dragMovedRef.current > 6) {
      event.preventDefault();
      event.stopPropagation();
    }
    dragMovedRef.current = 0;
  }

  if (total === 0) return null;

  return (
    <>
      <div
        ref={scrollerRef}
        className="vd-reel scrollbar-hide overflow-x-auto overflow-y-hidden py-5"
        onPointerEnter={() => {
          pausedRef.current = true;
        }}
        onPointerLeave={() => {
          pausedRef.current = false;
        }}
        onFocusCapture={() => {
          pausedRef.current = true;
        }}
        onBlurCapture={() => {
          pausedRef.current = false;
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
        role="group"
        aria-label="Vertical video reel. Scroll sideways or drag to browse."
      >
        {/* Rendered twice so the wrap at the halfway point is invisible. */}
        <div className="flex w-max gap-5">
          {[...videos, ...videos].map((video, index) => (
            <div key={`${video.id}-${index}`} className="flex-shrink-0">
              {renderCard(video)}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10 flex items-center justify-center gap-8">
        <button
          type="button"
          onClick={() => scrollByCards(-1)}
          aria-label="Previous video"
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
              onClick={() => scrollToIndex(index)}
              aria-label={`Go to ${video.title}`}
              aria-current={index === activeIndex}
              className={`rounded-full transition-all duration-300 ${
                index === activeIndex
                  ? "h-1.5 w-4 bg-white"
                  : "h-1.5 w-1.5 bg-white/25 hover:bg-white/50"
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => scrollByCards(1)}
          aria-label="Next video"
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
  );
}
