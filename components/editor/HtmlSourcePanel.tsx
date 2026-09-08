"use client";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Code2,
  Loader2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  applyBlockStyle,
  applyInlineStyle,
  type SourceEdit,
  type StyleMap,
} from "./source-edit";

/**
 * The HTML source editor, shared by every editable field.
 *
 * `HtmlEditable` opens it for a section body, `Editable` opens it for a
 * heading or a label. The difference is `mode`: a body is a block and can carry
 * paragraphs, alignment and vertical margin, while a heading renders inside an
 * existing element, so only inline formatting there makes sense — vertical
 * margin on a `<span>` does nothing, and offering it would be a lie.
 *
 * The pickers do not hold state of their own. Each one reads the caret, edits
 * the source string through the pure helpers in source-edit.ts, and writes the
 * result back — so the textarea stays the single source of truth and hand-typed
 * markup and clicked-in styles can never disagree.
 */

const PALETTE: { label: string; value: string }[] = [
  { label: "White", value: "#ffffff" },
  { label: "Muted", value: "rgba(255,255,255,0.55)" },
  { label: "Gold", value: "#c8a97e" },
  { label: "Warm grey", value: "#8a8378" },
  { label: "Red", value: "#e5484d" },
];

const SIZES: { label: string; value: string }[] = [
  { label: "XS", value: "0.8rem" },
  { label: "S", value: "0.95rem" },
  { label: "M", value: "1.1rem" },
  { label: "L", value: "1.4rem" },
  { label: "XL", value: "1.9rem" },
  { label: "2XL", value: "2.6rem" },
  // Shows off the CSS-function support: scales with the viewport.
  { label: "Fluid", value: "clamp(1.1rem, 3vw, 2.4rem)" },
];

const SPACES: { label: string; value: string }[] = [
  { label: "0", value: "0" },
  { label: "S", value: "0.75rem" },
  { label: "M", value: "1.5rem" },
  { label: "L", value: "3rem" },
  { label: "XL", value: "5rem" },
];

/** Inline snippets, valid in any field. */
const INLINE_SNIPPETS = [
  { label: "space", insert: "&nbsp;", title: "Non-breaking space — survives where a typed space collapses" },
  { label: "bold", insert: "<strong></strong>", title: "Bold" },
  { label: "italic", insert: "<em></em>", title: "Italic" },
];

/** Extra snippets that only make sense in a block. */
const BLOCK_SNIPPETS = [
  { label: "break", insert: "<br />", title: "Line break inside a paragraph" },
  { label: "para", insert: "<p></p>", title: "New paragraph" },
  { label: "list", insert: "<ul>\n  <li></li>\n</ul>", title: "Bulleted list" },
];

const chip =
  "rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-white/60 transition-colors hover:border-[#c8a97e]/50 hover:text-white";
const groupLabel = "w-14 shrink-0 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/30";

export function HtmlSourcePanel({
  source,
  mode = "block",
  label,
  busy = false,
  onSave,
  onCancel,
}: {
  source: string;
  mode?: "block" | "inline";
  label?: string;
  busy?: boolean;
  onSave: (value: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(source);
  const areaRef = useRef<HTMLTextAreaElement | null>(null);
  const isBlock = mode === "block";

  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    area.focus();
    // Land the caret at the end rather than selecting everything, so the first
    // keystroke does not wipe the field.
    area.setSelectionRange(draft.length, draft.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Push an edit back into the textarea and restore the caret. */
  function commitEdit(edit: SourceEdit) {
    setDraft(edit.text);
    requestAnimationFrame(() => {
      const area = areaRef.current;
      if (!area) return;
      area.focus();
      area.setSelectionRange(edit.selectionStart, edit.selectionEnd);
    });
  }

  function styleSelection(styles: StyleMap) {
    const area = areaRef.current;
    if (!area) return;
    commitEdit(applyInlineStyle(draft, area.selectionStart, area.selectionEnd, styles));
  }

  function styleBlock(styles: StyleMap) {
    const area = areaRef.current;
    if (!area) return;
    commitEdit(applyBlockStyle(draft, area.selectionStart, styles));
  }

  function insert(snippet: string) {
    const area = areaRef.current;
    if (!area) return;

    const { selectionStart: start, selectionEnd: end } = area;
    const selected = draft.slice(start, end);
    const closeAt = snippet.lastIndexOf("</");
    const text =
      closeAt === -1 ? snippet : snippet.slice(0, closeAt) + selected + snippet.slice(closeAt);
    const caret = closeAt === -1 ? start + text.length : start + closeAt + selected.length;

    commitEdit({
      text: draft.slice(0, start) + text + draft.slice(end),
      selectionStart: caret,
      selectionEnd: caret,
    });
  }

  const snippets = isBlock ? [...INLINE_SNIPPETS, ...BLOCK_SNIPPETS] : INLINE_SNIPPETS;

  return (
    <div className="rounded-md border border-[#c8a97e]/40 bg-black/80 p-3 text-left font-sans backdrop-blur-sm">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#c8a97e]">
          <Code2 className="size-3" />
          HTML{label ? ` — ${label}` : ""}
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="text-white/40 transition-colors hover:text-white"
          aria-label="Close without saving"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <div className="space-y-1.5 border-b border-white/[0.07] pb-2.5">
        {/* Colour — applies to the selected words. */}
        <div className="flex items-center gap-1.5">
          <span className={groupLabel}>Colour</span>
          {PALETTE.map((swatch) => (
            <button
              key={swatch.value}
              type="button"
              title={`${swatch.label} — applies to the selected text`}
              onClick={() => styleSelection({ color: swatch.value })}
              className="size-4 rounded-sm border border-white/20 transition-transform hover:scale-110"
              style={{ backgroundColor: swatch.value }}
            />
          ))}
          <input
            type="color"
            title="Custom colour"
            onChange={(event) => styleSelection({ color: event.target.value })}
            className="size-4 cursor-pointer rounded-sm border border-white/20 bg-transparent p-0"
          />
          <button type="button" onClick={() => styleSelection({ color: "" })} className={chip}>
            clear
          </button>
        </div>

        {/* Size — also on the selection. */}
        <div className="flex items-center gap-1.5">
          <span className={groupLabel}>Size</span>
          {SIZES.map((size) => (
            <button
              key={size.value}
              type="button"
              title={`font-size: ${size.value}`}
              onClick={() => styleSelection({ "font-size": size.value })}
              className={chip}
            >
              {size.label}
            </button>
          ))}
          <button type="button" onClick={() => styleSelection({ "font-size": "" })} className={chip}>
            clear
          </button>
        </div>

        {isBlock ? (
          <>
            <div className="flex items-center gap-1.5">
              <span className={groupLabel}>Space</span>
              <span className="text-[9px] text-white/25">above</span>
              {SPACES.map((space) => (
                <button
                  key={`t${space.value}`}
                  type="button"
                  title={`margin-top: ${space.value}`}
                  onClick={() => styleBlock({ "margin-top": space.value })}
                  className={chip}
                >
                  {space.label}
                </button>
              ))}
              <span className="ml-1 text-[9px] text-white/25">below</span>
              {SPACES.map((space) => (
                <button
                  key={`b${space.value}`}
                  type="button"
                  title={`margin-bottom: ${space.value}`}
                  onClick={() => styleBlock({ "margin-bottom": space.value })}
                  className={chip}
                >
                  {space.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <span className={groupLabel}>Padding</span>
              {SPACES.map((space) => (
                <button
                  key={`p${space.value}`}
                  type="button"
                  title={`padding: ${space.value}`}
                  onClick={() => styleBlock({ padding: space.value })}
                  className={chip}
                >
                  {space.label}
                </button>
              ))}
              <span className="ml-1 text-[9px] text-white/25">indent</span>
              {SPACES.slice(1).map((space) => (
                <button
                  key={`i${space.value}`}
                  type="button"
                  title={`padding-left: ${space.value}`}
                  onClick={() => styleBlock({ "padding-left": space.value })}
                  className={chip}
                >
                  {space.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <span className={groupLabel}>Align</span>
              {[
                { icon: AlignLeft, value: "left" },
                { icon: AlignCenter, value: "center" },
                { icon: AlignRight, value: "right" },
              ].map(({ icon: Icon, value }) => (
                <button
                  key={value}
                  type="button"
                  title={`text-align: ${value}`}
                  onClick={() => styleBlock({ "text-align": value })}
                  className={chip}
                >
                  <Icon className="size-3" />
                </button>
              ))}
              <span className="ml-2 text-[9px] text-white/25">
                spacing and alignment apply to the paragraph the cursor is in
              </span>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className={groupLabel}>Indent</span>
            {SPACES.slice(1).map((space) => (
              <button
                key={`li${space.value}`}
                type="button"
                title={`padding-left: ${space.value}`}
                onClick={() => styleSelection({ "padding-left": space.value })}
                className={chip}
              >
                {space.label}
              </button>
            ))}
            <span className="ml-2 text-[9px] text-white/25">
              this field sits inside a heading, so it takes inline styling only
            </span>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <span className={groupLabel}>Insert</span>
          {snippets.map((snippet) => (
            <button
              key={snippet.label}
              type="button"
              title={snippet.title}
              onClick={() => insert(snippet.insert)}
              className={chip}
            >
              {snippet.label}
            </button>
          ))}
        </div>
      </div>

      <textarea
        ref={areaRef}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
          }
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            onSave(draft);
          }
        }}
        spellCheck={false}
        rows={isBlock ? Math.min(22, Math.max(6, draft.split("\n").length + 2)) : 3}
        disabled={busy}
        placeholder={isBlock ? "<p>Your copy here.</p>" : "Your text"}
        className="mt-2.5 w-full resize-y rounded border border-white/10 bg-black/60 p-2 font-mono text-[12.5px] leading-relaxed text-white/85 outline-none focus:border-[#c8a97e]/60 disabled:opacity-60"
      />

      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-[10px] leading-snug text-white/35">
          Select words first, then pick a colour or size. <span className="text-white/50">⌘/Ctrl↵</span>{" "}
          saves, <span className="text-white/50">Esc</span> cancels.
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-white/45 transition-colors hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(draft)}
            disabled={busy}
            className="flex items-center gap-1.5 rounded bg-[#c8a97e] px-3 py-1 text-xs font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy && <Loader2 className="size-3 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
