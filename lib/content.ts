import "server-only";

import { asc, eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";

import { sections, settings, socialLinks, tryDb, videos } from "@/lib/db";
import { seedSections, seedSocialLinks, seedVideos } from "@/lib/db/seed-data";
import { defaultSettings, parseSettings, settingsKeys, type SettingsShape } from "@/lib/settings";
import type { PublicSection, PublicSocialLink, PublicVideo } from "@/lib/types";

export { sectionConfig, thumbnailFor } from "@/lib/types";
export type { PublicSection, PublicSocialLink, PublicVideo, SectionConfig } from "@/lib/types";

/**
 * Read side of the CMS. Everything here is wrapped in `unstable_cache` and
 * tagged, so the public site is served from cache until an admin mutation calls
 * `revalidateContent()`.
 *
 * Every getter degrades to the seed content on any failure. A missing or
 * unreachable database must never take the site down or break `next build`.
 */

export const CONTENT_TAG = "vd-content";
export const TAGS = {
  settings: "vd-settings",
  sections: "vd-sections",
  videos: "vd-videos",
  social: "vd-social",
} as const;

const REVALIDATE_SECONDS = 3600;

/* ───────────────────────── settings ───────────────────────── */

async function loadSettings(): Promise<SettingsShape> {
  const fallback = defaultSettings();
  const db = tryDb();
  if (!db) return fallback;

  try {
    const rows = await db.select().from(settings);
    const byKey = new Map(rows.map((row) => [row.key, row.value]));
    return Object.fromEntries(
      settingsKeys.map((key) => [
        key,
        byKey.has(key) ? parseSettings(key, byKey.get(key)) : fallback[key],
      ]),
    ) as SettingsShape;
  } catch {
    return fallback;
  }
}

export const getSettings = unstable_cache(loadSettings, ["vd:settings"], {
  tags: [CONTENT_TAG, TAGS.settings],
  revalidate: REVALIDATE_SECONDS,
});

/* ───────────────────────── sections ───────────────────────── */

function fallbackSections(): PublicSection[] {
  return seedSections.map((section) => ({ ...section }));
}

async function loadSections(): Promise<PublicSection[]> {
  const db = tryDb();
  if (!db) return fallbackSections();

  try {
    const rows = await db
      .select({
        key: sections.key,
        type: sections.type,
        title: sections.title,
        subtitle: sections.subtitle,
        config: sections.config,
      })
      .from(sections)
      .where(eq(sections.enabled, true))
      .orderBy(asc(sections.position));
    return rows.length > 0 ? rows : fallbackSections();
  } catch {
    return fallbackSections();
  }
}

export const getSections = unstable_cache(loadSections, ["vd:sections"], {
  tags: [CONTENT_TAG, TAGS.sections],
  revalidate: REVALIDATE_SECONDS,
});

/* ────────────────────────── videos ────────────────────────── */

function fallbackVideos(): PublicVideo[] {
  return seedVideos.map((video, index) => ({
    id: `seed-${index}`,
    title: video.title,
    youtubeId: video.youtubeId,
    orientation: video.orientation,
    client: video.client ?? "",
    year: video.year ?? "",
    role: "",
    description: "",
    thumbnailUrl: video.thumbnailUrl ?? "",
    featured: false,
  }));
}

async function loadVideos(): Promise<PublicVideo[]> {
  const db = tryDb();
  if (!db) return fallbackVideos();

  try {
    const rows = await db
      .select({
        id: videos.id,
        title: videos.title,
        youtubeId: videos.youtubeId,
        orientation: videos.orientation,
        client: videos.client,
        year: videos.year,
        role: videos.role,
        description: videos.description,
        thumbnailUrl: videos.thumbnailUrl,
        featured: videos.featured,
      })
      .from(videos)
      .where(eq(videos.published, true))
      .orderBy(asc(videos.position), asc(videos.createdAt));
    return rows.length > 0 ? rows : fallbackVideos();
  } catch {
    return fallbackVideos();
  }
}

export const getVideos = unstable_cache(loadVideos, ["vd:videos"], {
  tags: [CONTENT_TAG, TAGS.videos],
  revalidate: REVALIDATE_SECONDS,
});

export async function getVideosByOrientation(orientation: string) {
  const all = await getVideos();
  return all.filter((video) => video.orientation === orientation);
}

/* ─────────────────────── social links ─────────────────────── */

async function loadSocialLinks(): Promise<PublicSocialLink[]> {
  const db = tryDb();
  if (!db) return seedSocialLinks.map((link) => ({ ...link }));

  try {
    const rows = await db
      .select({ label: socialLinks.label, url: socialLinks.url })
      .from(socialLinks)
      .where(eq(socialLinks.enabled, true))
      .orderBy(asc(socialLinks.position));
    return rows.length > 0 ? rows : seedSocialLinks.map((link) => ({ ...link }));
  } catch {
    return seedSocialLinks.map((link) => ({ ...link }));
  }
}

export const getSocialLinks = unstable_cache(loadSocialLinks, ["vd:social"], {
  tags: [CONTENT_TAG, TAGS.social],
  revalidate: REVALIDATE_SECONDS,
});

/* ───────────────────── aggregate payload ──────────────────── */

export type SiteContent = {
  settings: SettingsShape;
  sections: PublicSection[];
  videos: PublicVideo[];
  social: PublicSocialLink[];
};

/** One call for the whole homepage — four parallel cached reads. */
export async function getSiteContent(): Promise<SiteContent> {
  const [settingsValue, sectionsValue, videosValue, socialValue] = await Promise.all([
    getSettings(),
    getSections(),
    getVideos(),
    getSocialLinks(),
  ]);
  return {
    settings: settingsValue,
    sections: sectionsValue,
    videos: videosValue,
    social: socialValue,
  };
}

/** Derive the site's absolute origin for canonical URLs and the sitemap. */
export function siteOrigin(canonicalUrl?: string) {
  const candidates = [
    canonicalUrl,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      return new URL(candidate).origin;
    } catch {
      continue;
    }
  }
  return "http://localhost:3000";
}
