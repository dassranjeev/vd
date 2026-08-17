"use client";

import { useEffect, useRef, useState } from "react";

import { patchSectionTextAction, patchSettingAction } from "@/lib/actions/inline";
import { cn } from "@/lib/utils";

import { useEditor } from "./EditorProvider";

/** Where an edited string is persisted. */
export type EditTarget =
  | { kind: "setting"; group: string; path: string }
  | { kind: "section"; id: string; field: "title" | "subtitle" | "body" };

function persist(target: EditTarget, value: string) {
  return target.kind === "setting"
    ? patchSettingAction({ group: target.group, path: target.path, value })
    : patchSectionTextAction({ id: target.id, field: target.field, value });
}

/** contentEditable inserts U+00A0 as you type; normalise to plain spaces. */
const NBSP = / /g;

/**
 * Inline-editable text. Renders as a plain span for visitors — identical markup
 * and styling, so the cached HTML is unchanged and there is no hydration
 * difference. Editing affordances appear only once an editing session is
 * confirmed and edit mode is on.
 *
 * Commit on blur or Enter; Escape reverts. Deliberately does not refresh the
 * router after a text save: the DOM already shows what was typed, so refreshing
 * would only cause a visible flicker.
 */
export function Editable({
  value,
  target,
  multiline = false,
  placeholder = "Empty",
  className,
}: {
  value: string;
  target: EditTarget;
  multiline?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const { editing, run } = useEditor();
  const ref = useRef<HTMLSpanElement | null>(null);
  const [text, setText] = useState(value);
  const [busy, setBusy] = useState(false);
  const dirty = useRef(false);

  // Adopt server updates only when the user isn't mid-edit.
  useEffect(() => {
    if (!dirty.current) setText(value);
  }, [value]);

  if (!editing) {
    return <span className={className}>{text}</span>;
  }

  async function commit() {
    const node = ref.current;
    if (!node) return;

    const raw = (node.textContent ?? "").replace(NBSP, " ");
    const next = multiline ? raw.trimEnd() : raw.replace(/\s+/g, " ").trim();

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

  return (
    <span
      // Remount when entering edit mode so the initial text lands in the DOM
      // once; React must not re-render it while the user is typing.
      key="editing"
      ref={ref}
      role="textbox"
      tabIndex={0}
      aria-label={`Edit ${target.kind === "setting" ? target.path : target.field}`}
      contentEditable={!busy}
      suppressContentEditableWarning
      spellCheck
      data-placeholder={placeholder}
      className={cn(
        "vd-editable",
        multiline && "vd-editable-block",
        busy && "vd-editable-busy",
        className,
      )}
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
        if (event.key === "Enter" && !multiline) {
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
  );
}
