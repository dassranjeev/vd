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

/** Section-level options stored in `sections.config`. */
export type SectionConfig = {
  orientation?: string;
  layout?: string;
  background?: string;
  columns?: number;
  autoScrollSeconds?: number;
  body?: string;
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
