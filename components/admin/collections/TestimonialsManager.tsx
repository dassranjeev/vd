"use client";

import {
  deleteTestimonialAction,
  saveTestimonialAction,
  toggleTestimonialAction,
} from "@/lib/actions/collections";
import type { Testimonial } from "@/lib/db";

import { CollectionManager, type CollectionRow } from "../CollectionManager";
import { ToggleField } from "../form";
import { MediaInput } from "../MediaInput";
import { Field, Input, Select, Textarea } from "../ui";

export function TestimonialsManager({ testimonials }: { testimonials: Testimonial[] }) {
  const rows: CollectionRow[] = testimonials.map((item) => ({
    id: item.id,
    title: item.author,
    meta: [item.role, item.company].filter(Boolean).join(" · ") || item.quote.slice(0, 70),
    thumbnail: item.avatarUrl,
    visible: item.published,
    badges: [
      ...(item.featured ? ([{ label: "Featured", tone: "warning" as const }]) : []),
      { label: item.published ? "Live" : "Hidden", tone: item.published ? ("success" as const) : ("neutral" as const) },
    ],
  }));

  const byId = new Map(testimonials.map((item) => [item.id, item]));

  return (
    <CollectionManager
      rows={rows}
      collection="testimonials"
      singular="Testimonial"
      plural="Testimonials"
      description="What clients have said. Keep quotes short enough to read at a glance."
      saveAction={saveTestimonialAction}
      deleteAction={deleteTestimonialAction}
      toggleAction={toggleTestimonialAction}
      renderFields={(id, errors) => {
        const item = id ? byId.get(id) : undefined;
        return (
          <>
            <Field label="Quote" error={errors?.quote} help="No quotation marks needed — added for you.">
              <Textarea name="quote" defaultValue={item?.quote ?? ""} rows={4} required maxLength={1200} />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Author" error={errors?.author}>
                <Input name="author" defaultValue={item?.author ?? ""} required maxLength={120} />
              </Field>

              <Field label="Role" help="e.g. Marketing Director">
                <Input name="role" defaultValue={item?.role ?? ""} maxLength={120} />
              </Field>

              <Field label="Company">
                <Input name="company" defaultValue={item?.company ?? ""} maxLength={120} />
              </Field>

              <Field label="Stars" help="Choose none to hide the rating.">
                <Select name="rating" defaultValue={String(item?.rating ?? 5)}>
                  <option value="0">No rating</option>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <option key={value} value={value}>
                      {value} star{value === 1 ? "" : "s"}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field label="Avatar" help="Optional. Initials are used when empty.">
              <MediaInput name="avatarUrl" defaultValue={item?.avatarUrl ?? ""} accept="image/*" />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <ToggleField
                name="published"
                label="Published"
                defaultChecked={item?.published ?? true}
              />
              <ToggleField
                name="featured"
                label="Featured"
                help="Flagged for future use, e.g. a single highlighted quote."
                defaultChecked={item?.featured ?? false}
              />
            </div>
          </>
        );
      }}
    />
  );
}
