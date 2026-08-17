"use client";

import { AlertCircle, Check, Loader2, LayoutDashboard, Pencil, Eye } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

import { useEditor } from "./EditorProvider";

/**
 * Floating bar shown only to a confirmed editing session. Renders nothing at all
 * for visitors, and nothing until the session check resolves — so it never
 * flashes on a public page load.
 */
export function EditorToolbar() {
  const { ready, isEditor, user, editing, setEditing, saveState, message } = useEditor();

  if (!ready || !isEditor) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[60] -translate-x-1/2 px-4">
      <div className="flex flex-wrap items-center justify-center gap-2 rounded-full border border-white/15 bg-black/90 py-2 pr-2 pl-4 shadow-2xl backdrop-blur-md">
        <span className="hidden text-[11px] tracking-wide text-white/45 sm:inline">
          {user?.name || user?.email}
        </span>

        <span aria-hidden="true" className="hidden h-4 w-px bg-white/15 sm:inline-block" />

        <button
          type="button"
          onClick={() => setEditing(!editing)}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium transition-colors",
            editing ? "bg-white text-black hover:bg-white/90" : "text-white/80 hover:bg-white/10",
          )}
        >
          {editing ? <Eye className="size-3.5" /> : <Pencil className="size-3.5" />}
          {editing ? "Done editing" : "Edit page"}
        </button>

        {editing && (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] transition-colors",
              saveState === "error" ? "text-red-300" : "text-white/45",
            )}
            role="status"
            aria-live="polite"
          >
            {saveState === "saving" && <Loader2 className="size-3 animate-spin" />}
            {saveState === "saved" && <Check className="size-3 text-emerald-400" />}
            {saveState === "error" && <AlertCircle className="size-3" />}
            {saveState === "idle" ? "Click any text to edit" : message}
          </span>
        )}

        <Link
          href="/admin"
          title="Open the admin panel"
          className="grid size-8 place-items-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LayoutDashboard className="size-4" />
        </Link>
      </div>
    </div>
  );
}
