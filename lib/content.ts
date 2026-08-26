import "server-only";

import { asc, desc, eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";

import { logos, photos, posts, sections, settings, socialLinks, testimonials, tryDb, videos } from "@/lib/db";
import { seedSections, seedSocialLinks, seedVideos } from "@/lib/db/seed-data";
import { defaultSettings, parseSettings, settingsKeys, type SettingsShape } from "@/lib/settings";
import type {
  PublicLogo,
  PublicPhoto,
  PublicPost,
  PublicSection,
  PublicSocialLink,
  PublicTestimonial,
  PublicVideo,
} from "@/lib/types";

export { sectionConfig, thumbnailFor } from "@/lib/types";
export type {
  PublicLogo,
  PublicPhoto,
  PublicPost,
  PublicSection,
  PublicSocialLink,
  PublicTestimonial,
  PublicVideo,
  SectionConfig,
} from "@/lib/types";

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
  photos: "vd-photos",
  logos: "vd-logos",
  testimonials: "vd-testimonials",
  posts: "vd-posts",
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
  // Fallback rows have no database identity, so the editor treats them as
  // read-only (there is nothing to write to until the DB is seeded).
  return seedSections.map((section) => ({ id: "", ...section }));
}

async function loadSections(): Promise<PublicSection[]> {
  const db = tryDb();
  if (!db) return fallbackSections();

  try {
    const rows = await db
      .select({
        id: sections.id,
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

/* ───────────────── photos / logos / testimonials ───────────── */

async function loadPhotos(): Promise<PublicPhoto[]> {
  const db = tryDb();
  if (!db) return [];
  try {
    return await db
      .select({
        id: photos.id,
        url: photos.url,
        alt: photos.alt,
        caption: photos.caption,
        aspect: photos.aspect,
        category: photos.category,
      })
      .from(photos)
      .where(eq(photos.published, true))
      .orderBy(asc(photos.position), asc(photos.createdAt));
  } catch {
    return [];
  }
}

export const getPhotos = unstable_cache(loadPhotos, ["vd:photos"], {
  tags: [CONTENT_TAG, TAGS.photos],
  revalidate: REVALIDATE_SECONDS,
});

async function loadLogos(): Promise<PublicLogo[]> {
  const db = tryDb();
  if (!db) return [];
  try {
    return await db
      .select({ id: logos.id, name: logos.name, imageUrl: logos.imageUrl, url: logos.url })
      .from(logos)
      .where(eq(logos.enabled, true))
      .orderBy(asc(logos.position), asc(logos.createdAt));
  } catch {
    return [];
  }
}

export const getLogos = unstable_cache(loadLogos, ["vd:logos"], {
  tags: [CONTENT_TAG, TAGS.logos],
  revalidate: REVALIDATE_SECONDS,
});

async function loadTestimonials(): Promise<PublicTestimonial[]> {
  const db = tryDb();
  if (!db) return [];
  try {
    return await db
      .select({
        id: testimonials.id,
        quote: testimonials.quote,
        author: testimonials.author,
        role: testimonials.role,
        company: testimonials.company,
        avatarUrl: testimonials.avatarUrl,
        rating: testimonials.rating,
      })
      .from(testimonials)
      .where(eq(testimonials.published, true))
      .orderBy(asc(testimonials.position), asc(testimonials.createdAt));
  } catch {
    return [];
  }
}

export const getTestimonials = unstable_cache(loadTestimonials, ["vd:testimonials"], {
  tags: [CONTENT_TAG, TAGS.testimonials],
  revalidate: REVALIDATE_SECONDS,
});

/* ────────────────────────── posts ─────────────────────────── */

async function loadPosts(): Promise<PublicPost[]> {
  const db = tryDb();
  if (!db) return [];
  try {
    const rows = await db
      .select({
        id: posts.id,
        title: posts.title,
        slug: posts.slug,
        excerpt: posts.excerpt,
        coverUrl: posts.coverUrl,
        tags: posts.tags,
        readMinutes: posts.readMinutes,
        publishedAt: posts.publishedAt,
      })
      .from(posts)
      .where(eq(posts.published, true))
      .orderBy(desc(posts.publishedAt), asc(posts.position));
    // Dates are serialised so the payload stays safe to hand to client components.
    return rows.map((row) => ({
      ...row,
      publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    }));
  } catch {
    return [];
  }
}

export const getPosts = unstable_cache(loadPosts, ["vd:posts"], {
  tags: [CONTENT_TAG, TAGS.posts],
  revalidate: REVALIDATE_SECONDS,
});

/** Full body for a single published post, used by /blog/[slug]. */
export async function getPostBySlug(slug: string) {
  const db = tryDb();
  if (!db) return null;
  try {
    const [row] = await db.select().from(posts).where(eq(posts.slug, slug)).limit(1);
    return row && row.published ? row : null;
  } catch {
    return null;
  }
}

/* ───────────────────── aggregate payload ──────────────────── */

export type SiteContent = {
  settings: SettingsShape;
  sections: PublicSection[];
  videos: PublicVideo[];
  social: PublicSocialLink[];
  photos: PublicPhoto[];
  logos: PublicLogo[];
  testimonials: PublicTestimonial[];
  posts: PublicPost[];
};

/** One call for the whole homepage: every read is cached and runs in parallel. */
export async function getSiteContent(): Promise<SiteContent> {
  const [settingsValue, sectionsValue, videosValue, socialValue, photosValue, logosValue, testimonialsValue, postsValue] =
    await Promise.all([
      getSettings(),
      getSections(),
      getVideos(),
      getSocialLinks(),
      getPhotos(),
      getLogos(),
      getTestimonials(),
      getPosts(),
    ]);
  return {
    settings: settingsValue,
    sections: sectionsValue,
    videos: videosValue,
    social: socialValue,
    photos: photosValue,
    logos: logosValue,
    testimonials: testimonialsValue,
    posts: postsValue,
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
