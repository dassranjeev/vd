"use client";

import { Code2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { patchSectionTextAction, patchSettingAction } from "@/lib/actions/inline";
import { hasInlineMarkup } from "@/lib/rich-text-shared";
import { cn } from "@/lib/utils";

import { useEditor } from "./EditorProvider";
import { HtmlSourcePanel } from "./HtmlSourcePanel";

/** Where an edited string is persisted. */
export type EditTarget =
  | { kind: "setting"; group: string; path: string }
  | {
      kind: "section";
      id: string;
      /** Mirrors SECTION_TEXT_FIELDS in lib/actions/inline.ts. */
      field: "title" | "subtitle" | "body" | "eyebrow" | "heading" | "ctaLabel" | "ctaHref" | "imageUrl";
    };

function persist(target: EditTarget, value: string) {
  return target.kind === "setting"
    ? patchSettingAction({ group: target.group, path: target.path, value })
    : patchSectionTextAction({ id: target.id, field: target.field, value });
}

function describe(target: EditTarget) {
  return target.kind === "setting" ? target.path : target.field;
}

/**
 * Whitespace that collapses in HTML — everything except a non-breaking space.
 *
 * `contentEditable` inserts U+00A0 for the second of two typed spaces, which is
 * exactly what makes a deliberate gap survive. The old code normalised those
 * back to plain spaces and then collapsed every run, which is why typing extra
 * space in a heading appeared to do nothing at all. Keeping U+00A0 while
 * collapsing real whitespace means a typed gap persists and a stray newline
 * still does not.
 */
const COLLAPSIBLE = /[^\S ]+/g;

/**
 * Inline-editable text.
 *
 * Renders as a plain span for visitors — identical markup and styling, so the
 * cached HTML is unchanged and there is no hydration difference. Editing
 * affordances appear only once an editing session is confirmed and edit mode is
 * on.
 *
 * Two editing paths, because one of them cannot work for markup:
 *
 *   plain text — typed over in place. Commit on blur or Enter, Escape reverts.
 *                Deliberately does not refresh the router afterwards: the DOM
 *                already shows what was typed.
 *   HTML       — opened in the source panel. Once a field contains tags,
 *                in-place editing is impossible: reading it back with
 *                `textContent` would silently throw the markup away.
 *
 * The `</>` button switches a plain field over to the source panel, which is
 * how colour, size and spacing get applied.
 */
export function Editable({
  value,
  target,
  placeholder = "Empty",
  className,
}: {
  value: string;
  target: EditTarget;
  placeholder?: string;
  className?: string;
}) {
  const { editing, run, refresh } = useEditor();
  const ref = useRef<HTMLSpanElement | null>(null);
  const [text, setText] = useState(value);
  const [busy, setBusy] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const dirty = useRef(false);

  // Adopt server updates only when the user isn't mid-edit.
  useEffect(() => {
    if (!dirty.current) setText(value);
  }, [value]);

  useEffect(() => {
    if (!editing) setSourceOpen(false);
  }, [editing]);

  const markup = hasInlineMarkup(text);

  if (!editing) {
    return markup ? (
      <span className={className} dangerouslySetInnerHTML={{ __html: text }} />
    ) : (
      <span className={className}>{text}</span>
    );
  }

  /** Save a value that came from the source panel. */
  async function saveSource(next: string) {
    setBusy(true);
    const ok = await run(() => persist(target, next));
    setBusy(false);
    if (!ok) return;
    setText(next);
    setSourceOpen(false);
    // The stored source is sanitized server-side, so what finally renders is
    // not necessarily byte-for-byte what was typed.
    refresh();
  }

  /** Commit in-place typing. */
  async function commit() {
    const node = ref.current;
    if (!node) return;

    const next = (node.textContent ?? "").replace(COLLAPSIBLE, " ").trim();

    if (!dirty.current || next === text) {
      dirty.current = false;
      return;
    }

    setBusy(true);
    const ok = await run(() => persist(target, next));
    setBusy(false);

    if (ok) {
      setText(next);
    } else if (ref.current) {
      ref.current.textContent = text; // roll back the visible text
    }
    dirty.current = false;
  }

  /**
   * The panel floats above the page rather than replacing the text.
   *
   * These fields sit inside an existing `<h2>`, `<p>` or `<span>`, so rendering
   * a panel where the text was would put a `<div>` inside a heading — invalid
   * nesting, and it would wreck the layout of the band being edited.
   */
  const panel =
    sourceOpen && typeof document !== "undefined"
      ? createPortal(
          <div className="vd-source-overlay" onClick={() => setSourceOpen(false)}>
            <div className="vd-source-dialog" onClick={(event) => event.stopPropagation()}>
              <HtmlSourcePanel
                source={text}
                mode="inline"
                label={describe(target)}
                busy={busy}
                onSave={saveSource}
                onCancel={() => setSourceOpen(false)}
              />
            </div>
          </div>,
          document.body,
        )
      : null;

  const toggle = (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        setSourceOpen(true);
      }}
      className="vd-html-toggle"
      title="Edit as HTML — colour, size, spacing"
      aria-label={`Edit ${describe(target)} as HTML`}
    >
      <Code2 className="size-2.5" />
    </button>
  );

  // A field that already holds markup cannot be typed over in place.
  if (markup) {
    return (
      <span className="vd-editable-wrap">
        <span
          role="button"
          tabIndex={0}
          onClick={(event) => {
            event.stopPropagation();
            setSourceOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setSourceOpen(true);
            }
          }}
          className={cn("vd-editable cursor-text", className)}
          dangerouslySetInnerHTML={{ __html: text }}
        />
        {toggle}
        {panel}
      </span>
    );
  }

  return (
    <span className="vd-editable-wrap">
      <span
        // Remount when entering edit mode so the initial text lands in the DOM
        // once; React must not re-render it while the user is typing.
        key="editing"
        ref={ref}
        role="textbox"
        tabIndex={0}
        aria-label={`Edit ${describe(target)}`}
        contentEditable={!busy}
        suppressContentEditableWarning
        spellCheck
        data-placeholder={placeholder}
        className={cn("vd-editable", busy && "vd-editable-busy", className)}
        onInput={() => {
          dirty.current = true;
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            if (ref.current) ref.current.textContent = text;
            dirty.current = false;
            ref.current?.blur();
            return;
          }
          if (event.key === "Enter") {
            event.preventDefault();
            ref.current?.blur();
          }
        }}
        onBlur={commit}
        // Clicking editable copy shouldn't trigger a surrounding link or lightbox.
        onClick={(event) => event.stopPropagation()}
      >
        {text}
      </span>
      {toggle}
      {panel}
    </span>
  );
}
