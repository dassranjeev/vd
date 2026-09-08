/**
 * Editing an inline `style` attribute inside a string of HTML source.
 *
 * The style pickers in HtmlSourcePanel need to do one of two things to whatever
 * the caret is in: put a style on the selected words, or put one on the block
 * they sit inside. Both come down to rewriting a `style` attribute in a string,
 * which is fiddly enough — and easy enough to get subtly wrong — that it lives
 * here as pure functions rather than tangled into a component.
 *
 * Deliberately not a parser. It merges into the tag that is already there when
 * it can find one, and wraps when it cannot, which covers what an editor does
 * in practice without pretending to understand arbitrary markup.
 */

export type StyleMap = Record<string, string>;

/** The result of an edit: new source, and where to leave the selection. */
export type SourceEdit = { text: string; selectionStart: number; selectionEnd: number };

/** Block-level tags a style can be attached to. */
const BLOCK_TAG = "p|h2|h3|h4|h5|h6|div|blockquote|li|figcaption";

export function parseStyle(style: string): StyleMap {
  const map: StyleMap = {};
  for (const part of style.split(";")) {
    const at = part.indexOf(":");
    if (at === -1) continue;
    const name = part.slice(0, at).trim().toLowerCase();
    const value = part.slice(at + 1).trim();
    if (name && value) map[name] = value;
  }
  return map;
}

export function formatStyle(map: StyleMap): string {
  return Object.entries(map)
    .map(([name, value]) => `${name}: ${value}`)
    .join("; ");
}

/**
 * Merge new declarations over existing ones.
 *
 * An empty value removes the property, which is how a picker's "none" option
 * clears a style instead of writing `color: ` and leaving dead markup behind.
 */
export function mergeStyle(existing: string, additions: StyleMap): string {
  const map = parseStyle(existing);
  for (const [name, value] of Object.entries(additions)) {
    if (value === "") delete map[name];
    else map[name.toLowerCase()] = value;
  }
  return formatStyle(map);
}

/** Rewrite one tag's `style` attribute. `open`/`close` bracket the whole tag. */
function restyleTag(src: string, open: number, close: number, styles: StyleMap): string {
  const tag = src.slice(open, close + 1);
  const existing = /\sstyle\s*=\s*"([^"]*)"/i.exec(tag);
  const merged = mergeStyle(existing ? existing[1] : "", styles);

  let next: string;
  if (existing) {
    next = merged
      ? tag.replace(existing[0], ` style="${merged}"`)
      : tag.replace(existing[0], "");
  } else if (merged) {
    // Insert before the closing bracket, keeping any self-closing slash.
    const selfClosing = /\/>$/.test(tag);
    const head = tag.slice(0, selfClosing ? -2 : -1).replace(/\s+$/, "");
    next = `${head} style="${merged}"${selfClosing ? " />" : ">"}`;
  } else {
    next = tag;
  }

  return src.slice(0, open) + next + src.slice(close + 1);
}

/**
 * Style the selected text.
 *
 * If the selection is already exactly the contents of a `<span>`, the style is
 * merged into that span rather than nesting another one inside it — otherwise
 * repeatedly clicking a swatch would build up a pile of wrappers.
 */
export function applyInlineStyle(
  src: string,
  start: number,
  end: number,
  styles: StyleMap,
): SourceEdit {
  const before = src.slice(0, start);
  const after = src.slice(end);
  const selected = src.slice(start, end);

  // Case 1: the caret sits inside an existing span — <span ...>[selection]</span>
  const openBefore = /<span\b[^>]*>$/i.exec(before);
  if (openBefore && /^<\/span>/i.test(after)) {
    const open = start - openBefore[0].length;
    const text = restyleTag(src, open, start - 1, styles);
    const shift = text.length - src.length;
    return { text, selectionStart: start + shift, selectionEnd: end + shift };
  }

  // Case 2: the selection is itself a whole span — [<span ...>text</span>]
  const whole = /^<span\b([^>]*)>([\s\S]*)<\/span>$/i.exec(selected);
  if (whole) {
    const inner = src.slice(start, start + selected.indexOf(">") + 1);
    const text = restyleTag(src, start, start + inner.length - 1, styles);
    return { text, selectionStart: start, selectionEnd: end + (text.length - src.length) };
  }

  // Case 3: nothing to merge into — wrap it.
  const declarations = formatStyle(styles);
  if (!declarations) return { text: src, selectionStart: start, selectionEnd: end };

  const open = `<span style="${declarations}">`;
  const text = `${before}${open}${selected}</span>${after}`;
  return { text, selectionStart: start + open.length, selectionEnd: start + open.length + selected.length };
}

/**
 * Style the block the caret is in.
 *
 * Vertical margin and text alignment do nothing on an inline `<span>`, so these
 * have to land on the enclosing paragraph or heading. When the source is still
 * plain text with no tags at all, the current paragraph — the run of text
 * between blank lines — is wrapped in a `<p>` so there is something to style.
 */
export function applyBlockStyle(
  src: string,
  start: number,
  styles: StyleMap,
  { wrapPlainText = true }: { wrapPlainText?: boolean } = {},
): SourceEdit {
  const before = src.slice(0, start);

  // The nearest block tag that is still open at the caret.
  const opens = [...before.matchAll(new RegExp(`<(?:${BLOCK_TAG})\\b[^>]*>`, "gi"))];
  const closes = [...before.matchAll(new RegExp(`</(?:${BLOCK_TAG})\\s*>`, "gi"))];
  const lastOpen = opens.at(-1);
  const lastClose = closes.at(-1);

  if (lastOpen && (!lastClose || lastOpen.index > lastClose.index)) {
    const open = lastOpen.index;
    const text = restyleTag(src, open, open + lastOpen[0].length - 1, styles);
    const shift = text.length - src.length;
    return { text, selectionStart: start + shift, selectionEnd: start + shift };
  }

  const declarations = formatStyle(styles);
  if (!declarations || !wrapPlainText) {
    return { text: src, selectionStart: start, selectionEnd: start };
  }

  // No enclosing block: wrap the bare run of text the caret is in.
  //
  // Bounded by any adjacent markup as well as by blank lines. Without the
  // markup bound, a caret in the loose text of `<p>done</p>outside` would wrap
  // the earlier paragraph too and nest one <p> inside another.
  const blankLine = before.lastIndexOf("\n\n");
  const from = Math.max(blankLine === -1 ? 0 : blankLine + 2, before.lastIndexOf(">") + 1);
  const rest = src.slice(from);
  const bounds = [rest.indexOf("\n\n"), rest.indexOf("<")].filter((at) => at !== -1);
  const to = bounds.length > 0 ? from + Math.min(...bounds) : src.length;

  const paragraph = src.slice(from, to).trim();
  if (!paragraph) return { text: src, selectionStart: start, selectionEnd: start };

  const open = `<p style="${declarations}">`;
  const text = `${src.slice(0, from)}${open}${paragraph}</p>${src.slice(to)}`;
  return {
    text,
    selectionStart: from + open.length,
    selectionEnd: from + open.length + paragraph.length,
  };
}
