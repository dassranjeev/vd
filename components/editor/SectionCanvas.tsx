"use client";

import dynamic from "next/dynamic";

import { useEditor } from "./EditorProvider";
import { SectionFrame } from "./SectionFrame";
import type { SectionItem } from "./SortableSections";

/**
 * dnd-kit is ~40 KB and only ever used by an admin who has switched edit mode
 * on, so it is code-split behind a dynamic import. Visitors — and even a
 * signed-in admin in preview mode — never download it.
 */
const SortableSections = dynamic(
  () => import("./SortableSections").then((module) => module.SortableSections),
  { ssr: false, loading: () => null },
);

/**
 * Renders the page's bands. In preview (and for every visitor) this is a plain
 * pass-through; in edit mode it hands off to the drag-and-drop layer.
 */
export function SectionCanvas({ items }: { items: SectionItem[] }) {
  const { editing } = useEditor();

  // Sections seeded from fallback content have no database id, so there is
  // nothing to persist a new order against.
  const sortable = editing && items.every((item) => item.id.length > 0);

  if (sortable) return <SortableSections items={items} />;

  return (
    <>
      {items.map((item, index) => (
        <SectionFrame
          key={item.key}
          id={item.id}
          type={item.type}
          label={item.label}
          isFirst={index === 0}
          isLast={index === items.length - 1}
        >
          {item.node}
        </SectionFrame>
      ))}
    </>
  );
}
