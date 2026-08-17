"use client";

import { ChevronDown, ChevronUp, EyeOff, Loader2, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { moveSectionAction, toggleSectionAction } from "@/lib/actions/sections";
import { cn } from "@/lib/utils";

import { useEditor } from "./EditorProvider";

const TYPE_LABELS: Record<string, string> = {
  hero: "Hero reel",
  about: "About statement",
  videos: "Video band",
  contact: "Contact",
  richtext: "Free text",
};

/**
 * Wraps a live section with hover controls in edit mode. Reuses exactly the same
 * server actions as the admin panel, so ordering and visibility behave
 * identically whichever surface you use.
 *
 * Renders a bare positioning wrapper when not editing, so the public layout is
 * untouched.
 */
export function SectionFrame({
  id,
  type,
  label,
  isFirst,
  isLast,
  handle,
  dragging = false,
  children,
}: {
  id: string;
  type: string;
  label: string;
  isFirst: boolean;
  isLast: boolean;
  /** Drag grip supplied by the sortable layer, if drag-and-drop is active. */
  handle?: React.ReactNode;
  dragging?: boolean;
  children: React.ReactNode;
}) {
  const { editing, refresh } = useEditor();
  const [pending, setPending] = useState<string | null>(null);

  async function act(name: string, run: () => Promise<unknown>) {
    setPending(name);
    try {
      await run();
      refresh();
    } finally {
      setPending(null);
    }
  }

  function move(direction: "up" | "down") {
    const form = new FormData();
    form.set("id", id);
    form.set("direction", direction);
    return act(direction, () => moveSectionAction(form));
  }

  function hide() {
    const form = new FormData();
    form.set("id", id);
    return act("hide", () => toggleSectionAction(form));
  }

  if (!editing) return <div className="relative">{children}</div>;

  const button =
    "grid h-8 w-8 place-items-center rounded-md text-white/70 transition-colors hover:bg-white/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-35";

  return (
    <div
      className={cn(
        "vd-section-frame relative",
        dragging && "vd-section-dragging",
        // While any drag is in flight the controls must stay put, not follow hover.
        handle && "vd-section-draggable",
      )}
    >
      {/* Control cluster, revealed on hover over the section */}
      <div className="vd-section-controls pointer-events-none absolute top-4 right-4 z-30 flex items-center gap-1 rounded-lg border border-white/15 bg-black/85 p-1 opacity-0 shadow-xl backdrop-blur-md transition-opacity">
        {handle}

        <span className="px-2 text-[10px] font-medium uppercase tracking-[0.14em] text-white/45">
          {label || TYPE_LABELS[type] || type}
        </span>

        <button
          type="button"
          onClick={() => move("up")}
          disabled={isFirst || pending !== null}
          title="Move section up"
          className={button}
        >
          {pending === "up" ? <Loader2 className="size-4 animate-spin" /> : <ChevronUp className="size-4" />}
        </button>

        <button
          type="button"
          onClick={() => move("down")}
          disabled={isLast || pending !== null}
          title="Move section down"
          className={button}
        >
          {pending === "down" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </button>

        <button
          type="button"
          onClick={hide}
          disabled={pending !== null}
          title="Hide this section from the site"
          className={button}
        >
          {pending === "hide" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <EyeOff className="size-4" />
          )}
        </button>

        <Link
          href={type === "videos" ? "/admin/videos" : "/admin/sections"}
          title="Open full settings"
          className={button}
        >
          <SlidersHorizontal className="size-4" />
        </Link>
      </div>

      {children}
    </div>
  );
}
