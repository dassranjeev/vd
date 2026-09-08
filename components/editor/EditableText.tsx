"use client";

import { textProps } from "@/lib/rich-text-shared";

import { Editable, type EditEntity } from "./Editable";

/** A database id, as opposed to a synthetic one on a seed fallback row. */
const isRealId = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

/**
 * One editable string on a collection row.
 *
 * Wraps `Editable` with the check every call site would otherwise repeat: when
 * the database is unreachable the site renders seed rows whose ids are
 * synthetic, and there is nothing to write an edit back to. Those stay
 * read-only rather than offering an editor that would fail on save.
 */
export function EditableText({
  entity,
  id,
  field,
  value,
  placeholder,
  className,
}: {
  entity: EditEntity;
  id: string;
  field: string;
  value: string;
  placeholder?: string;
  className?: string;
}) {
  if (!isRealId(id)) return <span className={className} {...textProps(value)} />;

  return (
    <Editable
      value={value}
      target={{ kind: "collection", entity, id, field }}
      placeholder={placeholder}
      className={className}
    />
  );
}
