/**
 * Prose helpers with no dependencies, so client components can import them.
 *
 * The sanitizer itself lives in lib/rich-text.ts and pulls in a parser that has
 * no business in the browser bundle. Everything here is pure string work: the
 * predicates a client needs to decide how to render a stored value, and the
 * plain-text-to-HTML conversion that both sides share.
 */

/**
 * Whether a block body should be treated as HTML.
 *
 * A real tag is the only signal. An entity on its own deliberately does not
 * count: someone writing otherwise-plain prose who reaches for `&nbsp;` to
 * force a gap still wants their blank lines to become paragraphs, and treating
 * that as HTML would skip the paragraph pass entirely.
 */
export function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*?>/i.test(value);
}

/**
 * Whether a single-line field carries markup that must be rendered as HTML.
 *
 * Unlike a block body, an entity counts here. There are no paragraphs to infer
 * in a heading, so a bare `&nbsp;` has no other way to mean anything — and an
 * entity cannot execute, so rendering one is safe regardless of where it came
 * from.
 */
export function hasInlineMarkup(value: string): boolean {
  return looksLikeHtml(value) || /&(?:[a-z][a-z0-9]*|#\d+|#x[0-9a-f]+);/i.test(value);
}

/**
 * Escape text, leaving existing entities intact.
 *
 * A bare `&` becomes `&amp;` — "Tom & Jerry" must not turn into markup — but a
 * written-out `&nbsp;` is passed through, because in plain text that is the one
 * way to ask for a space that will not collapse.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&(?!(?:[a-z][a-z0-9]*|#\d+|#x[0-9a-f]+);)/gi, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Keep the spacing the author actually typed.
 *
 * HTML collapses every run of whitespace to one space, which is why typing
 * extra spaces in the editor used to have no visible effect at all. Runs of two
 * or more become non-breaking spaces — all but the last, so the text can still
 * wrap at that point — and a leading indent is preserved in full.
 */
export function preserveSpacing(escaped: string): string {
  return escaped
    .replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;")
    .replace(/^ +/gm, (run) => "&nbsp;".repeat(run.length))
    .replace(/ {2,}/g, (run) => "&nbsp;".repeat(run.length - 1) + " ");
}

/**
 * Plain text to paragraphs.
 *
 * Blank lines separate paragraphs, a single newline is a line break inside
 * one, and horizontal spacing survives. This is the legacy authoring path:
 * bodies written before the HTML editor keep rendering the way they read.
 */
export function plainToHtml(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.replace(/\s+$/, ""))
    .filter((block) => block.trim().length > 0)
    .map((block) => `<p>${preserveSpacing(escapeHtml(block)).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

/**
 * Strip markup back to readable text.
 *
 * For the places a string cannot be markup: an `alt`, an `aria-label`, a
 * `title` tooltip, a `<title>` tag or an OpenGraph description. Rendering
 * `<span style="color:#c8a97e">Trek</span>` into an alt attribute would read
 * out the tags, so those callers take the text and drop the styling.
 */
export function stripMarkup(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Props for rendering a stored string that may carry inline markup.
 *
 * Spread onto the element that would otherwise have taken the value as a
 * child: `<h2 className="…" {...textProps(post.title)} />`. Values are
 * sanitized on both save and read, so what reaches here is already filtered to
 * the inline allowlist — this only decides whether to render it as markup or as
 * literal text.
 */
export function textProps(value: string):
  | { children: string }
  | { dangerouslySetInnerHTML: { __html: string } } {
  return hasInlineMarkup(value)
    ? { dangerouslySetInnerHTML: { __html: value } }
    : { children: value };
}
