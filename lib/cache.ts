import "server-only";

import { revalidatePath, updateTag } from "next/cache";

import { CONTENT_TAG, TAGS } from "@/lib/content";

/**
 * Called after every content mutation, from inside a server action.
 *
 * `updateTag` (rather than `revalidateTag`) expires the entry immediately and
 * gives read-your-own-writes semantics — so the editor sees their change the
 * instant the form comes back, not on the next background revalidation.
 */
export function revalidateContent(...tags: (keyof typeof TAGS)[]) {
  updateTag(CONTENT_TAG);
  for (const tag of tags) updateTag(TAGS[tag]);
  revalidatePath("/");
}
