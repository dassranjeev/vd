"use client";

import {
  Film,
  Image as ImageIcon,
  LayoutDashboard,
  LayoutTemplate,
  Link2,
  LogOut,
  Mail,
  Menu,
  Settings,
  UserCircle,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { logoutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

import { Badge } from "./ui";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/videos", label: "Videos", icon: Film },
  { href: "/admin/sections", label: "Page sections", icon: LayoutTemplate },
  { href: "/admin/settings", label: "Content & SEO", icon: Settings },
  { href: "/admin/social", label: "Social links", icon: Link2 },
  { href: "/admin/media", label: "Media library", icon: ImageIcon },
  { href: "/admin/messages", label: "Messages", icon: Mail, badgeKey: "unread" as const },
  { href: "/admin/users", label: "Team", icon: Users, adminOnly: true },
  { href: "/admin/account", label: "My account", icon: UserCircle },
];

export function Sidebar({
  user,
  unreadCount,
}: {
  user: { name: string; email: string; role: string };
  unreadCount: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const items = NAV.filter((item) => !item.adminOnly || user.role === "admin");

  const nav = (
    <nav className="space-y-0.5">
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-white/[0.09] font-medium text-white"
                : "text-white/50 hover:bg-white/[0.05] hover:text-white/85",
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="flex-1 truncate">{item.label}</span>
            {item.badgeKey === "unread" && unreadCount > 0 && (
              <Badge tone="info">{unreadCount}</Badge>
            )}
          </Link>
        );
      })}
    </nav>
  );

  const body = (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="flex items-center justify-between">
        <Link href="/admin" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <span
            className="grid size-8 place-items-center rounded-md bg-white text-sm font-bold text-black"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            VD
          </span>
          <span className="text-sm font-semibold text-white">Studio CMS</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-white/50 hover:text-white lg:hidden"
          aria-label="Close menu"
        >
          <X className="size-5" />
        </button>
      </div>

      {nav}

      <div className="mt-auto space-y-3 border-t border-white/[0.08] pt-4">
        <Link
          href="/"
          target="_blank"
          className="block truncate text-xs text-white/40 transition-colors hover:text-white"
        >
          View live site ↗
        </Link>

        <div className="min-w-0">
          <p className="truncate text-sm text-white/80">{user.name || user.email}</p>
          <p className="truncate text-xs text-white/35">
            {user.email} · {user.role}
          </p>
        </div>

        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-white/50 transition-colors hover:bg-white/[0.05] hover:text-white"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 text-sm text-white/70"
          aria-label="Open menu"
        >
          <Menu className="size-5" />
          Menu
        </button>
        <span className="text-sm font-semibold text-white">Studio CMS</span>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside className="admin-scroll relative h-full w-72 max-w-[85vw] overflow-y-auto border-r border-white/[0.08] bg-[#0a0a0a]">
            {body}
          </aside>
        </div>
      )}

      {/* Desktop rail */}
      <aside className="admin-scroll hidden w-64 shrink-0 overflow-y-auto border-r border-white/[0.08] bg-[#080808] lg:sticky lg:top-0 lg:block lg:h-screen">
        {body}
      </aside>
    </>
  );
}
