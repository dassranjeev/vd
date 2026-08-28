"use client";

import { RefreshCw } from "lucide-react";
import { useActionState } from "react";

import { refreshThumbnailsAction } from "@/lib/actions/videos";
import { idleState } from "@/lib/actions/types";

import { FormFeedback, SubmitButton } from "./form";

/**
 * Re-asks YouTube for every video's artwork.
 *
 * A client wrapper rather than a bare form action so the count comes back:
 * knowing how many changed is the whole point of pressing it.
 */
export function RefreshThumbnails() {
  const [state, action] = useActionState(refreshThumbnailsAction, idleState);

  return (
    <div className="flex flex-col items-end gap-2">
      <form action={action}>
        <SubmitButton variant="secondary" pendingLabel="Asking YouTube…">
          <RefreshCw />
          Refresh thumbnails
        </SubmitButton>
      </form>
      <FormFeedback state={state} />
    </div>
  );
}
