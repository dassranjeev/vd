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
/** How long an arrow or dot press takes to settle. */
const GLIDE_MS = 520;
export function VideoMarquee({
  videos,
  durationSeconds,
  wheelScroll = true,
  renderCard,
}: {
  videos: PublicVideo[];
  durationSeconds: number;
  /** Translate a vertical wheel into sideways movement. */
  wheelScroll?: boolean;
  renderCard: (video: PublicVideo) => React.ReactNode;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  /* Hover and touch pause the auto-scroll for different reasons and must be
     tracked separately: pointerleave fires the instant a finger lifts, while
     inertial scrolling is still running. */
  const hoverPausedRef = useRef(false);
  const touchPausedRef = useRef(false);
  const resumeTimerRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const dragMovedRef = useRef(0);
  const dragStartRef = useRef({ x: 0, scroll: 0 });
  const touchStartXRef = useRef(0);
  /* An arrow or dot press animates through the same rAF loop as the drift.
     Native smooth scrolling cannot be used here: the loop assigns scrollLeft
     every frame, and any direct assignment cancels an in-flight smooth
     scroll, so the buttons moved the strip by one frame and stopped. */
  const glideRef = useRef<{ from: number; to: number; start: number } | null>(null);

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
        const glide = glideRef.current;

        if (glide) {
          const progress = Math.min(1, (now - glide.start) / GLIDE_MS);
          // easeOutCubic: quick off the mark, settles gently.
          const eased = 1 - Math.pow(1 - progress, 3);
          el.scrollLeft = glide.from + (glide.to - glide.from) * eased;

          if (progress >= 1) {
            glideRef.current = null;
            scheduleResume(1200);
          }
        } else {
          const paused =
            hoverPausedRef.current || touchPausedRef.current || draggingRef.current;
          if (!reduced && !paused) {
            el.scrollLeft += (half / Math.max(1, durationSeconds)) * delta;
          }
        }

        // Normalise so the duplicated track loops in both directions. Skipped
        // mid-glide, which would otherwise jump the animation's end point.
        if (!glideRef.current) {
          if (el.scrollLeft >= half) el.scrollLeft -= half;
          else if (el.scrollLeft < 0) el.scrollLeft += half;
        }
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      if (resumeTimerRef.current !== null) window.clearTimeout(resumeTimerRef.current);
    };
  }, [durationSeconds]);

  /* ── Mouse wheel ────────────────────────────────────────────────────────
     A plain wheel has no horizontal axis, so without this the reel can only
     be dragged. Translating deltaY into sideways movement fixes that, but
     naively capturing every wheel event would trap the reader: the strip
     loops forever, so it never reaches an edge at which to hand scrolling
     back to the page.

     Hence the budget. A gesture may move the reel for a limited distance;
     past that the handler stops calling preventDefault and the page scrolls
     normally. Browsing the reel feels natural, and someone scrolling past it
     is released after a short travel rather than being stuck.

     Attached manually because React's onWheel is passive, so preventDefault
     inside it would be ignored.                                            */
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !wheelScroll) return;

    const BUDGET_PX = 1200;
    const GESTURE_GAP_MS = 450;

    let budget = 0;
    let lastEvent = 0;

    const onWheel = (event: WheelEvent) => {
      // Trackpads and tilt wheels already scroll this natively.
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      if (event.ctrlKey) return; // pinch-zoom

      const now = performance.now();
      if (now - lastEvent > GESTURE_GAP_MS) budget = 0;
      lastEvent = now;

      if (budget >= BUDGET_PX) return; // released for this gesture

      // deltaMode 1 is lines, 2 is pages; normalise both to pixels.
      const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? el.clientHeight : 1;
      const delta = event.deltaY * scale;

      glideRef.current = null;
      budget += Math.abs(delta);
      event.preventDefault();
      el.scrollLeft += delta;

      // Don't fight the reader while they are steering.
      touchPausedRef.current = true;
      scheduleResume(1200);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [wheelScroll]);

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

  /**
   * Starts a glide of `delta` pixels, handled by the loop above.
   *
   * The path is kept inside [0, 2 x half] so the browser never clamps it
   * mid-animation; the loop normalises back into range once it finishes.
   */
  const glideBy = useCallback((delta: number) => {
    const el = scrollerRef.current;
    if (!el || delta === 0) return;

    const half = el.scrollWidth / 2 || 1;
    let from = el.scrollLeft;
    let to = from + delta;

    if (to < 0) {
      from += half;
      to += half;
      el.scrollLeft = from;
    } else if (to > half * 2) {
      from -= half;
      to -= half;
      el.scrollLeft = from;
    }

    // Hold the drift off so it does not fight the glide, or resume on top of it.
    touchPausedRef.current = true;
    if (resumeTimerRef.current !== null) {
      window.clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }

    glideRef.current = { from, to, start: performance.now() };
  }, []);

  const scrollByCards = useCallback(
    (cards: number) => glideBy(cards * stepWidth()),
    [glideBy, stepWidth],
  );

  const scrollToIndex = useCallback(
    (index: number) => {
      const el = scrollerRef.current;
      if (!el) return;
      const half = el.scrollWidth / 2 || 1;
      const direct = index * stepWidth() - el.scrollLeft;
      // Travel to whichever copy of the target card is nearer.
      const wrapped = direct - Math.sign(direct) * half;
      glideBy(Math.abs(wrapped) < Math.abs(direct) ? wrapped : direct);
    },
    [glideBy, stepWidth],
  );
  /* ── Click-and-drag with a mouse ────────────────────────────────────────
     Touch and trackpads already scroll this natively, so pointer dragging is
     wired up for mice only: hijacking touch would fight the browser.        */

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    const el = scrollerRef.current;
    if (!el) return;

    draggingRef.current = true;
    glideRef.current = null;
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

  /* ── Finger scrolling ──────────────────────────────────────────────────
     The browser does the actual scrolling (see the note on touch-action in
     globals.css). All we do is stay out of its way: writing scrollLeft from
     the rAF loop during a flick would cancel the inertia, so auto-scroll is
     held off until the momentum has settled.                              */

  function pauseForTouch() {
    touchPausedRef.current = true;
    if (resumeTimerRef.current !== null) {
      window.clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  }

  /** Hold the auto-scroll off, then let it drift back in. */
  function scheduleResume(delay: number) {
    if (resumeTimerRef.current !== null) window.clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = window.setTimeout(() => {
      touchPausedRef.current = false;
      resumeTimerRef.current = null;
    }, delay);
  }

  function onTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    pauseForTouch();
    glideRef.current = null;
    touchStartXRef.current = event.touches[0]?.clientX ?? 0;
    dragMovedRef.current = 0;
  }

  function onTouchMove(event: React.TouchEvent<HTMLDivElement>) {
    const x = event.touches[0]?.clientX ?? 0;
    dragMovedRef.current = Math.max(dragMovedRef.current, Math.abs(x - touchStartXRef.current));
  }

  function onTouchEnd() {
    // Long enough for a flick's inertia to finish before we resume.
    scheduleResume(2500);
  }

  // A drag or swipe of more than a few pixels should not also open the lightbox.
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
        // Hover pause is mouse-only: pointerenter/leave also fire for touch,
        // and pointerleave lands while a flick is still coasting.
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") hoverPausedRef.current = true;
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse") hoverPausedRef.current = false;
        }}
        onFocusCapture={() => {
          hoverPausedRef.current = true;
        }}
        onBlurCapture={() => {
          hoverPausedRef.current = false;
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
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
