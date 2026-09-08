/**
 * Mapping between a private Blob pathname and the public URL the site serves.
 *
 * The store behind this project is a *private* Blob store: fetching one of its
 * URLs without credentials returns 403. Thumbnails, gallery photos and client
 * logos all have to be readable by ordinary visitors, so they are served
 * through `/api/media/**`, which reads the object with the store token and
 * streams it back.
 *
 * Everything an upload produces lives under a single prefix, and the proxy
 * route re-adds that prefix to whatever it is asked for. So the route can only
 * ever address objects inside `media/` — anything else in the store is
 * unreachable through it by construction, rather than by a check that could be
 * forgotten later.
 *
 * Pure and dependency-free: the upload client, the server action and the route
 * all need it.
 */

/** Every uploaded object lives under this prefix. */
export const MEDIA_PREFIX = "media/";

/** Where the proxy is mounted. */
export const MEDIA_ROUTE = "/api/media";

/**
 * A blob pathname to the URL that renders it.
 *
 * `media/still-abc123.jpg` becomes `/api/media/still-abc123.jpg`. Returns null
 * for anything outside the prefix, which has no servable URL.
 */
export function proxyUrlFor(pathname: string): string | null {
  if (!pathname.startsWith(MEDIA_PREFIX)) return null;

  const rest = pathname.slice(MEDIA_PREFIX.length);
  if (!rest || !isSafeRelativePath(rest)) return null;

  // Encode each segment so a space or a hash in a filename survives the trip.
  return `${MEDIA_ROUTE}/${rest.split("/").map(encodeURIComponent).join("/")}`;
}

/**
 * The route's captured segments back to a blob pathname.
 *
 * Returns null when the request is not addressing a plain file inside the
 * prefix — an empty path, or one trying to climb out with `..`.
 */
export function blobPathnameFor(segments: string[]): string | null {
  const rest = segments.map((segment) => safeDecode(segment)).join("/");
  if (!rest || !isSafeRelativePath(rest)) return null;
  return MEDIA_PREFIX + rest;
}

/** Whether a URL is one of our proxy URLs, as stored on a content row. */
export function isProxyUrl(url: string): boolean {
  return url.startsWith(`${MEDIA_ROUTE}/`);
}

/** The blob pathname behind a proxy URL, for deleting the underlying object. */
export function pathnameFromProxyUrl(url: string): string | null {
  if (!isProxyUrl(url)) return null;
  const rest = url.slice(MEDIA_ROUTE.length + 1).split("?")[0];
  return blobPathnameFor(rest.split("/"));
}

function safeDecode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    // A malformed escape is not a path to guess at. An empty segment is
    // rejected by isSafeRelativePath, so this fails the request cleanly.
    return "";
  }
}

/**
 * No traversal, no absolute paths, no control characters.
 *
 * A pathname is concatenated onto the prefix, so a `..` segment would let a
 * request address objects the proxy is not meant to expose.
 */
function isSafeRelativePath(path: string): boolean {
  if (path.startsWith("/") || path.includes("\\")) return false;
  // Control characters have no place in a pathname and can confuse a header.
  if (/[\u0000-\u001f\u007f]/.test(path)) return false;
  return path.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..");
}

