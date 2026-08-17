"use client";

import { useActionState, useState } from "react";

import { bulkImportVideosAction } from "@/lib/actions/videos";
import { idleState } from "@/lib/actions/types";

import { FormFeedback, SubmitButton } from "./form";
import { Card, CardHeader, Field, Select, Textarea } from "./ui";

/** Paste a batch of YouTube links and get them queued up as drafts. */
export function BulkImport() {
  const [state, action] = useActionState(bulkImportVideosAction, idleState);
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardHeader
        title="Bulk import"
        description="Paste several YouTube links at once. They land as drafts so you can title them before publishing."
        action={
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="text-xs text-white/45 transition-colors hover:text-white"
          >
            {open ? "Hide" : "Open"}
          </button>
        }
      />

      {open && (
        <form action={action} className="space-y-4">
          <Field label="Orientation" htmlFor="bulk-orientation">
            <Select id="bulk-orientation" name="orientation" defaultValue="horizontal">
              <option value="horizontal">Horizontal — 16:9</option>
              <option value="vertical">Vertical — 9:16</option>
            </Select>
          </Field>

          <Field
            label="Links"
            htmlFor="bulk-links"
            help="One per line. Add a title after a pipe: https://youtu.be/abc123… | Project name"
          >
            <Textarea
              id="bulk-links"
              name="links"
              rows={6}
              placeholder={"https://www.youtube.com/watch?v=QjF42R4Xfr0 | Mardi Himal Winter Trek\nhttps://youtu.be/cZmQ75BeiAg"}
            />
          </Field>

          <FormFeedback state={state} />

          <SubmitButton pendingLabel="Importing…">Import as drafts</SubmitButton>
        </form>
      )}
    </Card>
  );
}
