/**
 * Client-safe content types and helpers.
 *
 * lib/content.ts is server-only (it reaches for postgres), so anything a client
 * component needs at runtime lives here instead. Keep this module free of
 * database and Node imports.
 */

export type PublicVideo = {
  id: string;
  title: string;
  youtubeId: string;
  orientation: string;
  client: string;
  year: string;
  role: string;
  description: string;
  thumbnailUrl: string;
  featured: boolean;
};

export type PublicSection = {
  /** Needed by the front-end editor to target reorder/hide/inline-edit actions.
   *  Not a secret: it appears in the cached HTML, and every mutation that uses
   *  it re-checks authentication server-side. */
  id: string;
  key: string;
  type: string;
  title: string;
  subtitle: string;
  config: unknown;
};

export type PublicSocialLink = {
  label: string;
  url: string;
};

/**
 * Renderable section types.
 *
 * Lives here rather than beside the section actions because a `"use server"`
 * module may only export async functions — exporting this array from there
 * breaks module evaluation for every server action in the same graph.
 */
export const SECTION_TYPES = [
  "hero",
  "intro",
  "about",
  "videos",
  "gallery",
  "logos",
  "testimonials",
  "posts",
  "richtext",
  "contact",
] as const;
export type SectionType = (typeof SECTION_TYPES)[number];

/** Section-level options stored in `sections.config`. */
export type SectionConfig = {
  orientation?: string;
  layout?: string;
  background?: string;
  columns?: number;
  autoScrollSeconds?: number;
  body?: string;

  /* intro */
  eyebrow?: string;
  heading?: string;
  imageUrl?: string;
  imageSide?: string;
  ctaLabel?: string;
  ctaHref?: string;

  /* gallery / logos / testimonials / posts */
  limit?: number;
  grayscale?: boolean;
  showCaptions?: boolean;
  ctaAllLabel?: string;
};

export function sectionConfig(section: Pick<PublicSection, "config">): SectionConfig {
  return (section.config ?? {}) as SectionConfig;
}

/** Best available thumbnail for a video card. */
export function thumbnailFor(
  video: Pick<PublicVideo, "thumbnailUrl" | "youtubeId" | "orientation">,
) {
  if (video.thumbnailUrl) return video.thumbnailUrl;
  return video.orientation === "vertical"
    ? `https://img.youtube.com/vi/${video.youtubeId}/oardefault.jpg`
    : `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`;
}

export type PublicPhoto = {
  id: string;
  url: string;
  alt: string;
  caption: string;
  aspect: string;
  category: string;
};

export type PublicLogo = { id: string; name: string; imageUrl: string; url: string };

export type PublicTestimonial = {
  id: string;
  quote: string;
  author: string;
  role: string;
  company: string;
  avatarUrl: string;
  rating: number;
};

export type PublicPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverUrl: string;
  tags: string;
  readMinutes: number;
  publishedAt: string | null;
};

/** Masonry row-span buckets, keyed by the stored aspect. */
export const PHOTO_ASPECTS = [
  { value: "portrait", label: "Portrait (2:3)" },
  { value: "square", label: "Square (1:1)" },
  { value: "landscape", label: "Landscape (3:2)" },
  { value: "tall", label: "Tall (9:16)" },
  { value: "wide", label: "Wide (16:9)" },
] as const;
