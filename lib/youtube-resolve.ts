import "server-only";

import { YOUTUBE_ID_PATTERN, youtubeThumbnailTiers } from "./youtube";

/**
 * Asks YouTube which thumbnail actually exists, and returns the best one.
 *
 * Done when a video is saved rather than left to the browser, so the stored URL
 * is the real one: the admin can show it, and a visitor's first request hits an
 * image that exists instead of walking a fallback chain through 404s.
 *
 * A HEAD is enough — img.youtube.com answers with an accurate content-length,
 * and 404s the tiers it does not have.
 */

const TIMEOUT_MS = 4000;

/**
 * Missing derivatives are sometimes answered with a tiny grey placeholder and
 * HTTP 200 rather than a 404, so anything this small is treated as absent.
 */
const MIN_BYTES = 3000;

export async function resolveBestThumbnail(
  youtubeId: string,
  orientation: string,
): Promise<string> {
  if (!YOUTUBE_ID_PATTERN.test(youtubeId)) return "";

  for (const url of youtubeThumbnailTiers(youtubeId, orientation)) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(url, {
        method: "HEAD",
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timer);

      if (!response.ok) continue;

      const length = Number(response.headers.get("content-length") ?? 0);
      if (length > 0 && length < MIN_BYTES) continue;

      return url;
    } catch {
      // Network hiccup or timeout on this tier; try the next one.
    }
  }

  // Nothing resolved (bad id, or YouTube unreachable). Left empty so the
  // browser's own fallback chain still gets a chance at render time.
  return "";
}
