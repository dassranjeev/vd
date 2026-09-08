import sanitizeHtml from "sanitize-html";

/**
 * Prose handling for the two long-form fields — section `config.body` and a
 * blog post's `body`.
 *
 * Those fields accept either plain text (how everything was authored before
 * the HTML editor existed) or hand-written HTML. Both are stored as-is so the
 * editor always gets its own source back, and both are turned into safe markup
 * on the way out by `bodyHtml`.
 *
 * Everything here runs server-side only: `sanitizeHtml` pulls in a parser that
 * has no business in the browser bundle. Client components receive the already
 * sanitized string from `lib/content.ts`.
 */

/**
 * What an editor is allowed to write.
 *
 * Deliberately a formatting vocabulary, not a document one: enough to lay copy
 * out and space it, with nothing that can execute, navigate, or embed. `script`
 * and `style` are dropped along with their contents (sanitize-html's
 * `nonTextTags` default), and anything unlisted is discarded rather than
 * escaped, so a stray tag disappears instead of showing up as literal text.
 */
const ALLOWED_TAGS = [
  "p", "br", "hr", "div", "span",
  "h2", "h3", "h4", "h5", "h6",
  "strong", "b", "em", "i", "u", "s", "small", "mark", "sub", "sup",
  "ul", "ol", "li",
  "blockquote", "figure", "figcaption",
  "a", "img",
  "code", "pre",
];

/**
 * Style properties an editor may set inline.
 *
 * This list is the point of the whole feature: `margin`, `padding`,
 * `text-indent`, `letter-spacing`, `line-height` and `white-space` are how you
 * space copy deliberately. `position`, `z-index`, `width` and friends are left
 * out — they let a section escape its own box and break the page layout.
 */
const SPACING_AND_TYPE_STYLES: Record<string, RegExp[]> = {
  margin: [/^[\d.a-z%\s-]+$/i],
  "margin-top": [/^[\d.a-z%-]+$/i],
  "margin-bottom": [/^[\d.a-z%-]+$/i],
  "margin-left": [/^[\d.a-z%-]+$/i],
  "margin-right": [/^[\d.a-z%-]+$/i],
  padding: [/^[\d.a-z%\s-]+$/i],
  "padding-top": [/^[\d.a-z%-]+$/i],
  "padding-bottom": [/^[\d.a-z%-]+$/i],
  "padding-left": [/^[\d.a-z%-]+$/i],
  "padding-right": [/^[\d.a-z%-]+$/i],
  "text-indent": [/^[\d.a-z%-]+$/i],
  "text-align": [/^(left|right|center|justify|start|end)$/i],
  "letter-spacing": [/^[\d.a-z%-]+$/i],
  "word-spacing": [/^[\d.a-z%-]+$/i],
  "line-height": [/^[\d.a-z%-]+$/i],
  "white-space": [/^(normal|pre|pre-wrap|pre-line|nowrap)$/i],
  "font-style": [/^(normal|italic|oblique)$/i],
  "font-weight": [/^(normal|bold|lighter|bolder|[1-9]00)$/i],
  "font-size": [/^[\d.a-z%-]+$/i],
  "font-family": [/^[\w\s,'"-]+$/i],
  "text-transform": [/^(none|uppercase|lowercase|capitalize)$/i],
  "text-decoration": [/^[\w\s-]+$/i],
  // Hex, rgb()/rgba() and bare keywords — no url(), so no image loads.
  color: [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s.,%/]+\)$/i, /^[a-z-]+$/i],
  "background-color": [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s.,%/]+\)$/i, /^[a-z-]+$/i],
  display: [/^(block|inline|inline-block|flex|none)$/i],
  float: [/^(left|right|none)$/i],
  opacity: [/^[\d.]+$/],
};

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height", "loading"],
    // `style` and `class` are what make spacing possible; both are filtered —
    // style by `allowedStyles`, class by Tailwind simply ignoring nonsense.
    "*": ["style", "class", "id", "dir", "lang"],
  },
  allowedStyles: { "*": SPACING_AND_TYPE_STYLES },
  // No `javascript:` or `data:` — the second matters because `data:text/html`
  // in an href is a scripting vector.
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesAppliedToAttributes: ["href", "src"],
  // A protocol-relative `//evil.com` is still off-site; require an explicit one.
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",
  transformTags: {
    // A link that opens a new tab without this hands the opener window to the
    // destination, so set it rather than trusting the author to.
    a: (tagName, attribs) => ({
      tagName,
      attribs:
        attribs.target === "_blank"
          ? { ...attribs, rel: "noopener noreferrer" }
          : attribs,
    }),
  },
};

/** Run the allowlist over a fragment of author-written HTML. */
export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, OPTIONS);
}

/**
 * Whether a stored body should be treated as HTML.
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
 * Escape text, leaving existing entities intact.
 *
 * A bare `&` becomes `&amp;` — "Tom & Jerry" must not turn into markup — but a
 * written-out `&nbsp;` is passed through, because in plain text that is the one
 * way to ask for a space that will not collapse.
 */
function escapeHtml(text: string): string {
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
function preserveSpacing(escaped: string): string {
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
 * The single entry point for rendering a prose field.
 *
 * Sanitizes on the way out as well as on the way in: rows written before the
 * HTML editor shipped were never passed through the allowlist, and one of those
 * containing a stray `<` would otherwise reach the page unchecked.
 */
export function bodyHtml(raw: string | undefined | null): string {
  const value = (raw ?? "").trim();
  if (!value) return "";
  return looksLikeHtml(value) ? sanitizeRichText(value) : plainToHtml(value);
}

/**
 * Clean a body on save, leaving plain text alone.
 *
 * Plain text is stored verbatim so the editor gets back exactly what was typed
 * — including the spacing, which `bodyHtml` turns into real gaps at render.
 */
export function sanitizeBodyForStorage(value: string): string {
  return looksLikeHtml(value) ? sanitizeRichText(value) : value;
}
