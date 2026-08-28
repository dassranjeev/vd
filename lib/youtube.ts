/**
 * YouTube thumbnail tiers, in the order worth trying.
 *
 * The sizes are not interchangeable:
 *   maxresdefault  1280x720, true 16:9 — only if uploaded in HD
 *   sddefault       640x480, 4:3 with letterbox bars
 *   hqdefault       480x360, 4:3 with letterbox bars — served for every video
 *   mqdefault       320x180, true 16:9
 *   oardefault      the original aspect ratio, i.e. the tall frame for a Short
 *
 * Isomorphic on purpose: the server resolver probes this list when a video is
 * saved, and the browser walks the same list as a fallback. One definition, so
 * the two can never drift apart.
 */
export const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

export function youtubeThumbnailTiers(youtubeId: string, orientation: string): string[] {
  const base = `https://img.youtube.com/vi/${youtubeId}`;

  return orientation === "vertical"
    ? // Tall frame first, so a Short fills a 9:16 card instead of sitting in bars.
      [
        `${base}/oardefault.jpg`,
        `${base}/maxresdefault.jpg`,
        `${base}/sddefault.jpg`,
        `${base}/hqdefault.jpg`,
        `${base}/mqdefault.jpg`,
      ]
    : [
        `${base}/maxresdefault.jpg`,
        `${base}/sddefault.jpg`,
        `${base}/hqdefault.jpg`,
        `${base}/mqdefault.jpg`,
      ];
}

/** True for a URL this app derived from YouTube, rather than one an editor set. */
export function isDerivedYouTubeThumbnail(url: string) {
  return /^https:\/\/img\.youtube\.com\/vi\//i.test(url);
}
