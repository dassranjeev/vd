"use client";

import { deleteLogoAction, saveLogoAction, toggleLogoAction } from "@/lib/actions/collections";
import type { Logo } from "@/lib/db";

import { CollectionManager, type CollectionRow } from "../CollectionManager";
import { ToggleField } from "../form";
import { MediaInput } from "../MediaInput";
import { Field, Input } from "../ui";

export function LogosManager({ logos }: { logos: Logo[] }) {
  const rows: CollectionRow[] = logos.map((logo) => ({
    id: logo.id,
    title: logo.name,
    meta: logo.url || (logo.imageUrl ? "" : "No mark — the name will be set as type"),
    thumbnail: logo.imageUrl,
    visible: logo.enabled,
    badges: [{ label: logo.enabled ? "Shown" : "Hidden", tone: logo.enabled ? "success" : "neutral" }],
  }));

  const byId = new Map(logos.map((logo) => [logo.id, logo]));

  return (
    <CollectionManager
      rows={rows}
      collection="logos"
      singular="Client"
      plural="Clients"
      description="Logos for the carousel. A transparent PNG or SVG on a dark background works best."
      saveAction={saveLogoAction}
      deleteAction={deleteLogoAction}
      toggleAction={toggleLogoAction}
      renderFields={(id, errors) => {
        const logo = id ? byId.get(id) : undefined;
        return (
          <>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Client name" error={errors?.name} help="Also the image alt text.">
                <Input name="name" defaultValue={logo?.name ?? ""} required maxLength={120} />
              </Field>

              <Field label="Website" help="Optional. Makes the logo a link.">
                <Input name="url" defaultValue={logo?.url ?? ""} placeholder="https://…" />
              </Field>
            </div>

            <Field
              label="Logo image"
              help="Leave empty to set the client name as type instead — often cleaner than a mismatched logo."
            >
              <MediaInput name="imageUrl" defaultValue={logo?.imageUrl ?? ""} accept="image/*" />
            </Field>

            <ToggleField
              name="enabled"
              label="Shown in the carousel"
              defaultChecked={logo?.enabled ?? true}
            />
          </>
        );
      }}
    />
  );
}
