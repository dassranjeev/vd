"use client";

import {
  deletePhotoAction,
  savePhotoAction,
  togglePhotoAction,
} from "@/lib/actions/collections";
import type { Photo } from "@/lib/db";
import { PHOTO_ASPECTS } from "@/lib/types";

import { CollectionManager, type CollectionRow } from "../CollectionManager";
import { ToggleField } from "../form";
import { MediaInput } from "../MediaInput";
import { Field, Input, Select } from "../ui";

export function PhotosManager({ photos }: { photos: Photo[] }) {
  const rows: CollectionRow[] = photos.map((photo) => ({
    id: photo.id,
    title: photo.alt || photo.caption || photo.url.split("/").pop() || "Untitled",
    meta: [photo.category, photo.aspect].filter(Boolean).join(" · "),
    thumbnail: photo.url,
    visible: photo.published,
    badges: [{ label: photo.published ? "Live" : "Hidden", tone: photo.published ? "success" : "neutral" }],
  }));

  const byId = new Map(photos.map((photo) => [photo.id, photo]));

  return (
    <CollectionManager
      rows={rows}
      collection="photos"
      singular="Photo"
      plural="Photos"
      description="Stills and graphics for the masonry gallery. Order here is the order on the page."
      saveAction={savePhotoAction}
      deleteAction={deletePhotoAction}
      toggleAction={togglePhotoAction}
      renderFields={(id, errors) => {
        const photo = id ? byId.get(id) : undefined;
        return (
          <>
            <Field label="Image" help="Upload, or paste a URL or /public path." error={errors?.url}>
              <MediaInput name="url" defaultValue={photo?.url ?? ""} accept="image/*" />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Alt text"
                help="Described for screen readers and search."
                error={errors?.alt}
              >
                <Input name="alt" defaultValue={photo?.alt ?? ""} maxLength={300} />
              </Field>

              <Field label="Caption" help="Shown over the image. Optional.">
                <Input name="caption" defaultValue={photo?.caption ?? ""} maxLength={300} />
              </Field>

              <Field
                label="Shape"
                help="Sets how much room the photo takes in the grid."
                error={errors?.aspect}
              >
                <Select name="aspect" defaultValue={photo?.aspect ?? "portrait"}>
                  {PHOTO_ASPECTS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Category" help="Free text, for your own grouping.">
                <Input name="category" defaultValue={photo?.category ?? ""} maxLength={80} />
              </Field>
            </div>

            <ToggleField
              name="published"
              label="Published"
              help="Unpublished photos stay out of the gallery."
              defaultChecked={photo?.published ?? true}
            />
          </>
        );
      }}
    />
  );
}
