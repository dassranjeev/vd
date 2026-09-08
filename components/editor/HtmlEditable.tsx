"use client";

import { Code2 } from "lucide-react";
import { useEffect, useState } from "react";

import { patchSectionTextAction } from "@/lib/actions/inline";

import { useEditor } from "./EditorProvider";
import { HtmlSourcePanel } from "./HtmlSourcePanel";

/**
 * A prose block edited as HTML source.
 *
 * `Editable` is right for a heading: you type over the text in place. Prose is
 * different — the thing being edited (markup) is not the thing on screen
 * (rendered copy), so this opens a source panel instead of making the
 * paragraphs themselves contenteditable. That is also what makes deliberate
 * spacing possible: `&nbsp;`, `<br />` and a margin on a paragraph all survive,
 * where a contenteditable span would have them collapsed away.
 *
 * Two values come in because they are genuinely different: `source` is what the
 * editor typed, `html` is that source sanitized and rendered by
 * `lib/content.ts`. Visitors only ever see `html`.
 */
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
  const [busy, setBusy] = useState(false);

  // Leaving edit mode should not leave the source panel hanging open.
  useEffect(() => {
    if (!editing) setOpen(false);
  }, [editing]);

  /* ── Visitors, and editors who are not in edit mode ── */
  if (!editing) {
    if (!html) return null;
    return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
  }

  async function save(value: string) {
    setBusy(true);
    const ok = await run(() =>
      patchSectionTextAction({ id: sectionId, field: "body", value }),
    );
    setBusy(false);
    if (!ok) return;
    setOpen(false);
    // Unlike a plain-text edit, what was typed is not what gets displayed — the
    // markup has to go back through the sanitizer and renderer server-side
    // before we know what the section actually looks like.
    refresh();
  }

  if (open) {
    return (
      <HtmlSourcePanel
        source={source}
        mode="block"
        label="body"
        busy={busy}
        onSave={save}
        onCancel={() => setOpen(false)}
      />
    );
  }

  /* ── Closed: the rendered copy, click to open the source ── */
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(true)}
        // Not `vd-editable-block`: that sets `white-space: pre-wrap`, which the
        // rendered markup would inherit, turning the source's own newlines
        // between tags into visible line breaks.
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
