import sanitizeHtml from "sanitize-html";

import { looksLikeHtml, plainToHtml } from "./rich-text-shared";

export {
  escapeHtml,
  hasInlineMarkup,
  looksLikeHtml,
  plainToHtml,
  preserveSpacing,
} from "./rich-text-shared";

/**
 * Server-side sanitizing for every editor-authored string on the site.
 *
 * Two vocabularies, because the fields are genuinely different:
 *
 *   block  — a section's `config.body` and a post's `body`. Paragraphs, lists,
 *            headings, images: a small document.
 *   inline — every short field: headings, eyebrows, subtitles, labels. These
 *            render inside an existing `<h2>`, `<p>` or `<span>`, so a `<p>` or
 *            `<div>` there would be invalid nesting and would break the layout.
 *            Only inline formatting is allowed.
 *
 * Everything here runs server-side only: `sanitizeHtml` pulls in a parser that
 * has no business in the browser bundle. Client components get already-clean
 * values from `lib/content.ts` and render them with the pure predicates in
 * lib/rich-text-shared.ts.
 */

/** A length: `1.5rem`, `20px`, `0`, `2rem 0 1rem`. */
const LENGTH = /^[\d.a-z%\s-]+$/i;

/**
 * A CSS function, for responsive sizing — `clamp(1rem, 2vw, 2rem)`.
 *
 * Anchored to these four names on purpose: it is what keeps `url(...)` and
 * IE's `expression(...)` out while still allowing a fluid font size. No quotes
 * or backslashes are permitted inside.
 */
const CSS_FN = /^(?:clamp|calc|min|max)\(\s*[\d.a-z%,\s+*/()-]+\s*\)$/i;

const SIZE = [LENGTH, CSS_FN];
const COLOR = [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s.,%/]+\)$/i, /^hsla?\([\d\s.,%/deg]+\)$/i, /^[a-z-]+$/i];

/**
 * Style properties an editor may set inline.
 *
 * This list is the point of the whole feature: colour, size, margin and padding
 * are what an editor actually reaches for. `position`, `z-index`, `top`/`left`
 * and `transform` are deliberately absent — they let a section escape its own
 * box and break the page around it.
 */
const ALLOWED_STYLES: Record<string, RegExp[]> = {
  color: COLOR,
  "background-color": COLOR,

  "font-size": SIZE,
  "font-weight": [/^(normal|bold|lighter|bolder|[1-9]00)$/i],
  "font-style": [/^(normal|italic|oblique)$/i],
  "font-family": [/^[\w\s,'"-]+$/i],
  "line-height": SIZE,
  "letter-spacing": SIZE,
  "word-spacing": SIZE,
  "text-align": [/^(left|right|center|justify|start|end)$/i],
  "text-transform": [/^(none|uppercase|lowercase|capitalize)$/i],
  "text-decoration": [/^[\w\s-]+$/i],
  "text-indent": SIZE,
  "white-space": [/^(normal|pre|pre-wrap|pre-line|nowrap)$/i],

  margin: SIZE,
  "margin-top": SIZE,
  "margin-bottom": SIZE,
  "margin-left": SIZE,
  "margin-right": SIZE,
  padding: SIZE,
  "padding-top": SIZE,
  "padding-bottom": SIZE,
  "padding-left": SIZE,
  "padding-right": SIZE,

  // Bounded box tweaks: a max-width or a border is safe, a position is not.
  "max-width": SIZE,
  "border-radius": SIZE,
  border: [/^[\d.a-z%\s#(),/-]+$/i],
  "border-left": [/^[\d.a-z%\s#(),/-]+$/i],
  "border-top": [/^[\d.a-z%\s#(),/-]+$/i],
  "border-bottom": [/^[\d.a-z%\s#(),/-]+$/i],
  display: [/^(block|inline|inline-block|flex|none)$/i],
  opacity: [/^[\d.]+$/],
};

/** Formatting that is valid inside an existing heading or paragraph. */
const INLINE_TAGS = [
  "span", "br", "strong", "b", "em", "i", "u", "s",
  "small", "mark", "sub", "sup", "a", "code",
];

/** The block vocabulary: inline formatting plus real document structure. */
const BLOCK_TAGS = [
  ...INLINE_TAGS,
  "p", "hr", "div",
  "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li",
  "blockquote", "figure", "figcaption",
  "img", "pre",
];

function optionsFor(tags: string[]): sanitizeHtml.IOptions {
  return {
    allowedTags: tags,
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "width", "height", "loading"],
      // `style` is what makes colour, size and spacing possible; it is filtered
      // by `allowedStyles`, and `class` is harmless because Tailwind simply
      // ignores anything it does not recognise.
      "*": ["style", "class", "id", "dir", "lang"],
    },
    allowedStyles: { "*": ALLOWED_STYLES },
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
          attribs.target === "_blank" ? { ...attribs, rel: "noopener noreferrer" } : attribs,
      }),
    },
  };
}

const BLOCK_OPTIONS = optionsFor(BLOCK_TAGS);
const INLINE_OPTIONS = optionsFor(INLINE_TAGS);

export type RichTextMode = "block" | "inline";

/** Run the allowlist over a fragment of author-written HTML. */
export function sanitizeRichText(html: string, mode: RichTextMode = "block"): string {
  return sanitizeHtml(html, mode === "inline" ? INLINE_OPTIONS : BLOCK_OPTIONS);
}

/**
 * Clean a value on save, leaving plain text alone.
 *
 * Plain text is stored verbatim so the editor gets back exactly what was typed
 * — including the spacing, which the render pass turns into real gaps. Only a
 * value that actually contains a tag goes through the parser, which also means
 * this is safe to run over a URL or a colour: without a tag it is a no-op.
 */
export function sanitizeIfHtml(value: string, mode: RichTextMode = "block"): string {
  return looksLikeHtml(value) ? sanitizeRichText(value, mode) : value;
}

/** Kept as a named export because the write paths read better with it. */
export const sanitizeBodyForStorage = (value: string) => sanitizeIfHtml(value, "block");

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
  return looksLikeHtml(value) ? sanitizeRichText(value, "block") : plainToHtml(value);
}

/**
 * Sanitize every string in a stored blob, in place.
 *
 * Used on the read side so that a value written before any of this existed is
 * still safe by the time a component renders it, without needing a migration.
 * It is deliberately shape-preserving: a string with no tag comes back
 * byte-identical, so URLs, colours and ordinary copy are untouched and the
 * editor still gets its own source back.
 *
 * `body` is the one key treated as a block; everything else is a short field
 * rendered inside existing markup, so it gets the inline vocabulary.
 */
export function deepSanitize<T>(input: T, key?: string): T {
  if (typeof input === "string") {
    return sanitizeIfHtml(input, key === "body" ? "block" : "inline") as unknown as T;
  }
  if (Array.isArray(input)) {
    return input.map((item) => deepSanitize(item, key)) as unknown as T;
  }
  // Plain objects only. A `Date` (a post's `publishedAt`) is also `typeof
  // "object"`, and walking its entries would return an empty object and throw
  // the value away.
  if (input && typeof input === "object" && Object.getPrototypeOf(input) === Object.prototype) {
    return Object.fromEntries(
      Object.entries(input as Record<string, unknown>).map(([k, v]) => [k, deepSanitize(v, k)]),
    ) as unknown as T;
  }
  return input;
}
