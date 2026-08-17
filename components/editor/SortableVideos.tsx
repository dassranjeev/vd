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
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useMemo, useState } from "react";

import { reorderVideosAction } from "@/lib/actions/reorder";
import { thumbnailFor, type PublicVideo } from "@/lib/types";

import { useEditor } from "./EditorProvider";

/**
 * Drag-and-drop reordering for the cards inside one video band.
 *
 * Loaded on demand by VideoSection, so dnd-kit stays out of the public bundle.
 * Unlike sections, cards are small — so the whole card is the drag handle and
 * the overlay is a scaled copy of the card itself.
 */
function SortableCard({
  video,
  vertical,
  children,
}: {
  video: PublicVideo;
  vertical: boolean;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: video.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={[
        "relative touch-none",
        vertical ? "w-[220px] flex-shrink-0" : "w-full",
        isDragging ? "z-10 opacity-40" : "",
      ].join(" ")}
      {...attributes}
      {...listeners}
    >
      {children}
      {/* Grip badge, so it's obvious the card can be dragged */}
      <span className="pointer-events-none absolute top-2 left-2 z-20 grid size-6 place-items-center rounded-md border border-white/25 bg-black/70 text-white/80 backdrop-blur-sm">
        <GripVertical className="size-3.5" />
      </span>
    </div>
  );
}

export function SortableVideos({
  videos,
  orientation,
  vertical,
  columns,
  renderCard,
}: {
  videos: PublicVideo[];
  orientation: string;
  vertical: boolean;
  columns: string;
  renderCard: (video: PublicVideo) => React.ReactNode;
}) {
  const { run, refresh } = useEditor();

  const [order, setOrder] = useState<string[]>(() => videos.map((video) => video.id));
  const [activeId, setActiveId] = useState<string | null>(null);

  const byId = useMemo(() => new Map(videos.map((video) => [video.id, video])), [videos]);

  // Adopt a new server order when the data underneath changes.
  const serverOrder = videos.map((video) => video.id).join(",");
  const [seen, setSeen] = useState(serverOrder);
  if (serverOrder !== seen) {
    setSeen(serverOrder);
    setOrder(videos.map((video) => video.id));
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const ordered = order
    .map((id) => byId.get(id))
    .filter((video): video is PublicVideo => Boolean(video));
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
    setOrder(next);

    const ok = await run(() => reorderVideosAction({ orientation, ids: next }));
    if (!ok) {
      setOrder(previous);
      return;
    }
    refresh();
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <SortableContext items={order} strategy={rectSortingStrategy}>
        {/* In edit mode a marquee band is laid out as a static wrapped row: the
            duplicated, animating track can't be dragged coherently. */}
        <div
          className={
            vertical
              ? "flex flex-wrap justify-center gap-5 px-8 md:px-20 lg:px-32"
              : `mx-auto grid max-w-[1100px] gap-4 ${columns}`
          }
        >
          {ordered.map((video) => (
            <SortableCard key={video.id} video={video} vertical={vertical}>
              {renderCard(video)}
            </SortableCard>
          ))}
        </div>
      </SortableContext>

      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.16,1,0.3,1)" }}>
        {active ? (
          <div
            className={`overflow-hidden rounded-sm border-2 border-[#c8a97e] shadow-2xl ${
              vertical ? "w-[220px]" : "w-[260px]"
            }`}
          >
            <div className={`relative bg-neutral-900 ${vertical ? "aspect-[9/16]" : "aspect-video"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumbnailFor(active)}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-black/70 px-2 py-1.5 backdrop-blur-sm">
                <p className="line-clamp-1 text-[11px] text-white">{active.title}</p>
              </div>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
