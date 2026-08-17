"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useMemo, useState } from "react";

import { reorderSectionsAction } from "@/lib/actions/reorder";

import { useEditor } from "./EditorProvider";
import { SectionFrame } from "./SectionFrame";

export type SectionItem = {
  id: string;
  key: string;
  type: string;
  label: string;
  node: React.ReactNode;
};

const TYPE_LABELS: Record<string, string> = {
  hero: "Hero reel",
  about: "About statement",
  videos: "Video band",
  contact: "Contact",
  richtext: "Free text",
};

function SortableSection({
  item,
  isFirst,
  isLast,
}: {
  item: SectionItem;
  isFirst: boolean;
  isLast: boolean;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "relative z-10" : undefined}
    >
      <SectionFrame
        id={item.id}
        type={item.type}
        label={item.label}
        isFirst={isFirst}
        isLast={isLast}
        dragging={isDragging}
        handle={
          <button
            ref={setActivatorNodeRef}
            type="button"
            {...attributes}
            {...listeners}
            title="Drag to reorder this section"
            aria-label={`Drag ${item.label || TYPE_LABELS[item.type] || item.type} to reorder`}
            className="grid h-8 w-8 cursor-grab touch-none place-items-center rounded-md text-white/70 transition-colors hover:bg-white/15 hover:text-white active:cursor-grabbing"
          >
            <GripVertical className="size-4" />
          </button>
        }
      >
        {item.node}
      </SectionFrame>
    </div>
  );
}

/**
 * Drag-and-drop reordering for the whole page.
 *
 * Loaded on demand (see SectionCanvas) so dnd-kit never ships to visitors.
 *
 * Sections are full-viewport-height, so dragging the band itself would be
 * unwieldy. Instead the grip drags a compact labelled chip — the DragOverlay —
 * while the bands below shift to preview the drop position. This is why the
 * overlay is a chip rather than a clone of the section.
 */
export function SortableSections({ items }: { items: SectionItem[] }) {
  const { run, refresh } = useEditor();

  // Optimistic order. Reset from props whenever the server sends a new set.
  const [order, setOrder] = useState<string[]>(() => items.map((item) => item.id));
  const [activeId, setActiveId] = useState<string | null>(null);

  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  const serverOrder = items.map((item) => item.id).join(",");
  const [seenServerOrder, setSeenServerOrder] = useState(serverOrder);
  if (serverOrder !== seenServerOrder) {
    setSeenServerOrder(serverOrder);
    setOrder(items.map((item) => item.id));
  }

  const sensors = useSensors(
    // A small activation distance keeps clicks on inline text from starting a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const ordered = order.map((id) => byId.get(id)).filter((item): item is SectionItem => Boolean(item));
  const active = activeId ? byId.get(activeId) : null;

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  async function onDragEnd(event: DragEndEvent) {
    const { active: dragged, over } = event;
    setActiveId(null);
    if (!over || dragged.id === over.id) return;

    const from = order.indexOf(String(dragged.id));
    const to = order.indexOf(String(over.id));
    if (from < 0 || to < 0) return;

    const previous = order;
    const next = arrayMove(order, from, to);
    setOrder(next); // optimistic

    const ok = await run(() => reorderSectionsAction(next));
    if (!ok) {
      setOrder(previous); // roll back on failure
      return;
    }
    // Pull the authoritative order (and anything else that changed) back down.
    refresh();
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        {ordered.map((item, index) => (
          <SortableSection
            key={item.id}
            item={item}
            isFirst={index === 0}
            isLast={index === ordered.length - 1}
          />
        ))}
      </SortableContext>

      {/* Compact chip that follows the cursor, instead of a 100vh clone. */}
      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.16,1,0.3,1)" }}>
        {active ? (
          <div className="flex items-center gap-2 rounded-full border border-[#c8a97e]/60 bg-black/90 px-4 py-2 shadow-2xl backdrop-blur-md">
            <GripVertical className="size-4 text-[#c8a97e]" />
            <span className="text-xs font-medium tracking-wide text-white">
              {active.label || TYPE_LABELS[active.type] || active.type}
            </span>
            <span className="text-[10px] uppercase tracking-[0.14em] text-white/40">
              {TYPE_LABELS[active.type] ?? active.type}
            </span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
