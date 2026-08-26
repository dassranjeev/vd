"use client";

import { ChevronDown, ChevronUp, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";

import { reorderCollectionAction } from "@/lib/actions/collections";
import { idleState, type ActionState } from "@/lib/actions/types";
import { cn } from "@/lib/utils";

import { ConfirmSubmit, FormFeedback, SubmitButton } from "./form";
import { Badge, Card, CardHeader, EmptyState } from "./ui";

/**
 * Shared shell for the photo / logo / testimonial / post screens.
 *
 * Each of those collections is the same interaction — an ordered list of rows,
 * each expandable into a form, plus an "add" form at the bottom — so the shell
 * lives here and callers supply only the row summary and the fields.
 */

export type CollectionRow = {
  id: string;
  /** Main label in the collapsed row. */
  title: string;
  /** Secondary line. */
  meta?: string;
  /** Small square preview, if the row has an image. */
  thumbnail?: string;
  visible: boolean;
  badges?: { label: string; tone?: "neutral" | "success" | "warning" | "info" | "danger" }[];
};

export function CollectionManager({
  rows,
  singular,
  plural,
  description,
  collection,
  saveAction,
  deleteAction,
  toggleAction,
  renderFields,
  addLabel = "Add",
}: {
  rows: CollectionRow[];
  singular: string;
  plural: string;
  description: string;
  /** Must match a key in the reorder whitelist. */
  collection: "photos" | "logos" | "testimonials" | "posts";
  saveAction: (prev: ActionState, form: FormData) => Promise<ActionState>;
  deleteAction: (form: FormData) => Promise<void>;
  toggleAction: (form: FormData) => Promise<void>;
  /** Form body for a row; `id` is undefined for the create form. */
  renderFields: (id: string | undefined, errors?: Record<string, string>) => React.ReactNode;
  addLabel?: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(rows.length === 0);
  const [order, setOrder] = useState<string[]>(() => rows.map((row) => row.id));
  const [reorderError, setReorderError] = useState<string | null>(null);

  // Adopt a fresh server order after any change.
  const serverOrder = rows.map((row) => row.id).join(",");
  const [seen, setSeen] = useState(serverOrder);
  if (serverOrder !== seen) {
    setSeen(serverOrder);
    setOrder(rows.map((row) => row.id));
  }

  const byId = new Map(rows.map((row) => [row.id, row]));
  const ordered = order.map((id) => byId.get(id)).filter((row): row is CollectionRow => Boolean(row));

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;

    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];

    const previous = order;
    setOrder(next);
    setReorderError(null);

    const result = await reorderCollectionAction({ collection, ids: next });
    if (!result.ok) {
      setOrder(previous);
      setReorderError(result.error ?? "Could not save the new order.");
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title={plural}
          description={description}
          action={
            <button
              type="button"
              onClick={() => {
                setAdding((open) => !open);
                setOpenId(null);
              }}
              className="inline-flex items-center gap-1.5 text-xs text-white/50 transition-colors hover:text-white"
            >
              <Plus className="size-3.5" />
              {adding ? "Close" : `${addLabel} ${singular.toLowerCase()}`}
            </button>
          }
        />

        {reorderError && <p className="mb-4 text-xs text-red-400">{reorderError}</p>}

        {ordered.length === 0 ? (
          <EmptyState
            title={`No ${plural.toLowerCase()} yet`}
            description={`Add your first ${singular.toLowerCase()} below. The band stays hidden from visitors while this is empty.`}
          />
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {ordered.map((row, index) => (
              <li key={row.id} className={cn("py-3", !row.visible && "opacity-55")}>
                <div className="flex items-center gap-3">
                  <div className="flex shrink-0 flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      title="Move up"
                      className="grid h-6 w-6 place-items-center rounded text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-25"
                    >
                      <ChevronUp className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === ordered.length - 1}
                      title="Move down"
                      className="grid h-6 w-6 place-items-center rounded text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-25"
                    >
                      <ChevronDown className="size-3.5" />
                    </button>
                  </div>

                  {row.thumbnail !== undefined && (
                    <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded border border-white/[0.08] bg-black/40">
                      {row.thumbnail ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={row.thumbnail} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-[9px] uppercase text-white/25">none</span>
                      )}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => setOpenId(openId === row.id ? null : row.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block truncate text-sm font-medium text-white/90">
                      {row.title}
                    </span>
                    {row.meta && (
                      <span className="mt-0.5 block truncate text-xs text-white/35">{row.meta}</span>
                    )}
                  </button>

                  <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
                    {row.badges?.map((badge) => (
                      <Badge key={badge.label} tone={badge.tone ?? "neutral"}>
                        {badge.label}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setOpenId(openId === row.id ? null : row.id)}
                      className="rounded-md px-2 py-1 text-xs text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white"
                    >
                      {openId === row.id ? "Close" : "Edit"}
                    </button>

                    <form action={toggleAction}>
                      <input type="hidden" name="id" value={row.id} />
                      <SubmitButton
                        variant="ghost"
                        size="icon"
                        title={row.visible ? "Hide from the site" : "Show on the site"}
                      >
                        {row.visible ? <Eye /> : <EyeOff />}
                      </SubmitButton>
                    </form>

                    <form action={deleteAction}>
                      <input type="hidden" name="id" value={row.id} />
                      <ConfirmSubmit
                        message={`Delete "${row.title}"? This cannot be undone.`}
                        title="Delete"
                        className="text-white/40 hover:text-red-300"
                      >
                        <Trash2 />
                      </ConfirmSubmit>
                    </form>
                  </div>
                </div>

                {openId === row.id && (
                  <div className="mt-4 border-t border-white/[0.06] pt-4">
                    <RowForm id={row.id} saveAction={saveAction} renderFields={renderFields} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {adding && (
        <Card>
          <CardHeader title={`${addLabel} ${singular.toLowerCase()}`} />
          <RowForm id={undefined} saveAction={saveAction} renderFields={renderFields} />
        </Card>
      )}
    </div>
  );
}

/** One form instance, so each row keeps its own action state. */
function RowForm({
  id,
  saveAction,
  renderFields,
}: {
  id: string | undefined;
  saveAction: (prev: ActionState, form: FormData) => Promise<ActionState>;
  renderFields: (id: string | undefined, errors?: Record<string, string>) => React.ReactNode;
}) {
  const [state, action] = useActionState(saveAction, idleState);

  return (
    <form action={action} className="space-y-5">
      {id && <input type="hidden" name="id" value={id} />}
      {renderFields(id, state.fieldErrors)}
      <FormFeedback state={state} />
      <SubmitButton variant="primary" pendingLabel="Saving…">
        {id ? "Save changes" : "Add"}
      </SubmitButton>
    </form>
  );
}
