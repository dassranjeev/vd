"use client";

import { Code2, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { patchSectionTextAction } from "@/lib/actions/inline";

import { useEditor } from "./EditorProvider";

/**
 * A prose block edited as HTML source.
 *
 * `Editable` is right for a heading or a label: you type over the text in
 * place. Prose is different — the thing being edited (markup) is not the thing
 * on screen (rendered copy), so this opens a source panel instead of making the
 * paragraphs themselves contenteditable. That is also what makes deliberate
 * spacing possible: `&nbsp;`, `<br />` and a margin on a paragraph all survive,
 * where a contenteditable span would have them collapsed away.
 *
 * Two values come in because they are genuinely different: `source` is what the
 * editor typed, `html` is that source sanitized and rendered by
 * `lib/content.ts`. Visitors only ever see `html`.
 */

/** Shortcuts for the spacing that plain typing cannot express. */
const SNIPPETS: { label: string; insert: string; title: string }[] = [
  {
    label: "space",
    insert: "&nbsp;",
    title: "Non-breaking space — survives where a typed space collapses",
  },
  { label: "break", insert: "<br />", title: "Line break inside a paragraph" },
  { label: "para", insert: "<p></p>", title: "New paragraph" },
  {
    label: "gap",
    insert: '<p style="margin-top: 2rem"></p>',
    title: "Paragraph with extra space above it",
  },
  { label: "bold", insert: "<strong></strong>", title: "Bold" },
  { label: "italic", insert: "<em></em>", title: "Italic" },
];

export function HtmlEditable({
  sectionId,
  source,
  html,
  className,
  placeholder = "Add copy for this section.",
}: {
  sectionId: string;
  source: string;
  html: string;
  className?: string;
  placeholder?: string;
}) {
  const { editing, run, refresh } = useEditor();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(source);
  const [busy, setBusy] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement | null>(null);

  // Adopt a newer server value, but never while the panel is open and holding
  // unsaved edits.
  useEffect(() => {
    if (!open) setDraft(source);
  }, [source, open]);

  useEffect(() => {
    if (open) areaRef.current?.focus();
  }, [open]);

  // Leaving edit mode should not leave the source panel hanging open.
  useEffect(() => {
    if (!editing) setOpen(false);
  }, [editing]);

  /* ── Visitors, and editors who are not in edit mode ── */
  if (!editing) {
    if (!html) return null;
    return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
  }

  async function save() {
    setBusy(true);
    const ok = await run(() =>
      patchSectionTextAction({ id: sectionId, field: "body", value: draft }),
    );
    setBusy(false);
    if (!ok) return;
    setOpen(false);
    // Unlike a plain-text edit, what was typed is not what gets displayed — the
    // markup has to go back through the sanitizer and renderer server-side
    // before we know what the section actually looks like.
    refresh();
  }

  function cancel() {
    setDraft(source);
    setOpen(false);
  }

  /** Drop a snippet in at the cursor, wrapping any selection. */
  function insert(snippet: string) {
    const area = areaRef.current;
    if (!area) return;

    const { selectionStart: start, selectionEnd: end } = area;
    const selected = draft.slice(start, end);
    const closeAt = snippet.lastIndexOf("</");
    // For a tag pair, wrap the selection; for a bare entity, just insert it.
    const text =
      closeAt === -1 ? snippet : snippet.slice(0, closeAt) + selected + snippet.slice(closeAt);

    setDraft(draft.slice(0, start) + text + draft.slice(end));

    // Put the caret inside the tags so typing continues in the right place.
    const caret = closeAt === -1 ? start + text.length : start + closeAt + selected.length;
    requestAnimationFrame(() => {
      area.focus();
      area.setSelectionRange(caret, caret);
    });
  }

  /* ── Closed: the rendered copy, click to open the source ── */
  if (!open) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(true)}
          // Not `vd-editable-block`: that sets `white-space: pre-wrap`, which
          // the rendered markup would inherit and turn the source's own
          // newlines between tags into visible line breaks.
          className="vd-editable block w-full cursor-text text-left"
          aria-label="Edit this copy as HTML"
        >
          {html ? (
            <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <span className="text-sm italic text-white/30">{placeholder}</span>
          )}
        </button>
        <span className="pointer-events-none absolute -top-2 right-0 flex items-center gap-1 rounded bg-[#c8a97e] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-black">
          <Code2 className="size-2.5" />
          HTML
        </span>
      </div>
    );
  }

  /* ── Open: the source panel ── */
  return (
    <div className="rounded-md border border-[#c8a97e]/40 bg-black/70 p-3 text-left backdrop-blur-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#c8a97e]">
          <Code2 className="size-3" />
          HTML source
        </span>
        <button
          type="button"
          onClick={cancel}
          className="text-white/40 transition-colors hover:text-white"
          aria-label="Close without saving"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <div className="mb-2 flex flex-wrap gap-1">
        {SNIPPETS.map((snippet) => (
          <button
            key={snippet.label}
            type="button"
            title={snippet.title}
            onClick={() => insert(snippet.insert)}
            className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-white/60 transition-colors hover:border-[#c8a97e]/50 hover:text-white"
          >
            {snippet.label}
          </button>
        ))}
      </div>

      <textarea
        ref={areaRef}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            cancel();
          }
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            void save();
          }
        }}
        spellCheck={false}
        rows={Math.min(24, Math.max(6, draft.split("\n").length + 2))}
        disabled={busy}
        placeholder="<p>Your copy here.</p>"
        className="w-full resize-y rounded border border-white/10 bg-black/60 p-2 font-mono text-[12.5px] leading-relaxed text-white/85 outline-none focus:border-[#c8a97e]/60 disabled:opacity-60"
      />

      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-[10px] leading-snug text-white/35">
          Plain text still works — blank lines make paragraphs. Use{" "}
          <code className="text-white/55">&amp;nbsp;</code> for a space that will not collapse.
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={cancel}
            className="text-xs text-white/45 transition-colors hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
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
