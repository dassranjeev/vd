"use client";

import {
  AlertCircle,
  Check,
  ExternalLink,
  Film,
  Image as ImageIcon,
  LayoutDashboard,
  LayoutTemplate,
  Loader2,
  LogOut,
  Mail,
  Pencil,
  Plus,
  Settings,
  Eye,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { logoutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

import { useEditor } from "./EditorProvider";

const BAR_HEIGHT = "44px";

const LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/videos", label: "Videos", icon: Film },
  { href: "/admin/sections", label: "Sections", icon: LayoutTemplate },
  { href: "/admin/settings", label: "Content", icon: Settings },
  { href: "/admin/media", label: "Media", icon: ImageIcon },
  { href: "/admin/messages", label: "Messages", icon: Mail },
];

/**
 * Fixed admin bar across the top of the live site, shown only to a confirmed
 * editing session.
 *
 * It reserves its own space by setting `--vd-adminbar`, which the page wrapper
 * uses as padding and the hero subtracts from its height. The variable defaults
 * to 0px, so for visitors the layout is byte-identical.
 */
export function AdminBar() {
  const { ready, isEditor, user, editing, setEditing, saveState, message } = useEditor();
  const [menuOpen, setMenuOpen] = useState(false);

  const active = ready && isEditor;

  useEffect(() => {
    const root = document.documentElement;
    if (!active) return;

    root.style.setProperty("--vd-adminbar", BAR_HEIGHT);
    return () => {
      // Braces matter: removeProperty returns a string, and an implicit return
      // would be treated as an effect destructor.
      root.style.removeProperty("--vd-adminbar");
    };
  }, [active]);

  if (!active) return null;

  return (
    <>
      <div
        className="fixed inset-x-0 top-0 z-[70] border-b border-white/10 bg-[#0b0b0b]/95 backdrop-blur-md"
        style={{ height: BAR_HEIGHT }}
      >
        <div className="flex h-full items-center gap-1 px-2 sm:px-3">
          {/* Identity */}
          <Link
            href="/admin"
            className="flex shrink-0 items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-white/10"
            title="Admin dashboard"
          >
            <span
              className="grid size-6 place-items-center rounded bg-white text-[10px] font-bold text-black"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              VD
            </span>
            <span className="hidden text-xs font-semibold text-white sm:inline">Studio</span>
          </Link>

          <span aria-hidden="true" className="mx-1 h-5 w-px shrink-0 bg-white/10" />

          {/* Primary nav — collapses into a menu on small screens */}
          <nav className="hidden items-center gap-0.5 lg:flex">
            {LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-white/65 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <Icon className="size-3.5" />
                  {link.label}
                </Link>
              );
            })}
            <Link
              href="/admin/videos/new"
              className="ml-1 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-white/65 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Plus className="size-3.5" />
              Add video
            </Link>
          </nav>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-white/65 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="size-3.5" /> : <LayoutDashboard className="size-3.5" />}
            Manage
          </button>

          <div className="flex-1" />

          {/* Save status while editing */}
          {editing && (
            <span
              role="status"
              aria-live="polite"
              className={cn(
                "hidden items-center gap-1.5 px-2 text-[11px] sm:inline-flex",
                saveState === "error" ? "text-red-300" : "text-white/45",
              )}
            >
              {saveState === "saving" && <Loader2 className="size-3 animate-spin" />}
              {saveState === "saved" && <Check className="size-3 text-emerald-400" />}
              {saveState === "error" && <AlertCircle className="size-3" />}
              {saveState === "idle" ? "Drag the grips, or click any text" : message}
            </span>
          )}

          {/* The core toggle */}
          <button
            type="button"
            onClick={() => setEditing(!editing)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
              editing
                ? "bg-[#c8a97e] text-black hover:bg-[#d4b992]"
                : "bg-white text-black hover:bg-white/90",
            )}
          >
            {editing ? <Eye className="size-3.5" /> : <Pencil className="size-3.5" />}
            <span className="hidden sm:inline">{editing ? "Done" : "Edit page"}</span>
          </button>

          <span aria-hidden="true" className="mx-1 hidden h-5 w-px shrink-0 bg-white/10 sm:block" />

          <span className="hidden max-w-[140px] truncate px-1 text-[11px] text-white/40 xl:inline">
            {user?.name || user?.email}
          </span>

          <form action={logoutAction} className="shrink-0">
            <button
              type="submit"
              title="Sign out"
              className="grid size-8 place-items-center rounded-md text-white/55 transition-colors hover:bg-white/10 hover:text-white"
            >
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Small-screen dropdown */}
      {menuOpen && (
        <div
          className="fixed inset-x-0 z-[69] border-b border-white/10 bg-[#0b0b0b]/98 px-3 py-3 backdrop-blur-md lg:hidden"
          style={{ top: BAR_HEIGHT }}
        >
          <nav className="grid grid-cols-2 gap-1">
            {LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <Icon className="size-4" />
                  {link.label}
                </Link>
              );
            })}
            <Link
              href="/admin/videos/new"
              onClick={() => setMenuOpen(false)}
              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Plus className="size-4" />
              Add video
            </Link>
            <Link
              href="/"
              target="_blank"
              onClick={() => setMenuOpen(false)}
              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <ExternalLink className="size-4" />
              Open live
            </Link>
          </nav>

          {editing && message && (
            <p className={cn("mt-2 px-3 text-xs", saveState === "error" ? "text-red-300" : "text-white/45")}>
              {message}
            </p>
          )}
        </div>
      )}
    </>
  );
}
