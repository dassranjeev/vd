import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Accepts a bare YouTube id or any common YouTube URL and returns the id.
 * Lets an editor paste whatever they copied from the browser.
 */
export function extractYouTubeId(input: string): string {
  const value = input.trim();
  if (!value) return "";
  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) return value;

  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/(?:embed|shorts|live|v)\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match) return match[1];
  }
  return value;
}

/**
 * True when a link is a YouTube Short.
 *
 * Shorts are vertical by definition, so the admin uses this to pick the right
 * band instead of leaving everything in the 16:9 default.
 */
export function isYouTubeShortsLink(input: string): boolean {
  return /youtube\.com\/shorts\//i.test(input.trim());
}

export function formatBytes(bytes: number) {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

/**
 * Absolute timestamp.
 *
 * The time zone is pinned rather than left to the runtime. Without it the
 * server (UTC on Vercel) and the browser (whatever the reader is in) format
 * the same instant differently, which is a guaranteed hydration mismatch.
 * Pass a zone explicitly from client code that wants local time.
 */
export function formatDate(
  date: Date | string | null | undefined,
  timeZone: string | undefined = "UTC",
) {
  if (!date) return "—";
  const parsed = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString("en-CA", {
    timeZone,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function relativeTime(date: Date | string | null | undefined) {
  if (!date) return "—";
  const parsed = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.round((Date.now() - parsed.getTime()) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["second", 60],
    ["minute", 60],
    ["hour", 24],
    ["day", 7],
    ["week", 4.35],
    ["month", 12],
    ["year", Number.POSITIVE_INFINITY],
  ];

  let value = seconds;
  for (const [unit, divisor] of units) {
    if (Math.abs(value) < divisor) {
      return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(-Math.round(value), unit);
    }
    value /= divisor;
  }
  return "—";
}

/** Turn a title into a stable slug for section keys. */
export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Post date for cards and article headers.
 *
 * Lives here rather than beside PostsSection because that module is a client
 * component: a server component cannot call a function exported across the
 * client boundary, only render it as a component. Fixed locale so the server
 * and client produce the same string.
 */
export function formatPostDate(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}
