"use client";

import { ChevronDown, ChevronUp, Eye, EyeOff, Trash2 } from "lucide-react";
import { useActionState } from "react";

import {
  createSocialLinkAction,
  deleteSocialLinkAction,
  moveSocialLinkAction,
  toggleSocialLinkAction,
  updateSocialLinkAction,
} from "@/lib/actions/social";
import { idleState } from "@/lib/actions/types";
import type { SocialLink } from "@/lib/db";

import { ConfirmSubmit, FormFeedback, SubmitButton } from "./form";
import { Card, CardHeader, EmptyState, Field, Input } from "./ui";

function LinkRow({ link, isFirst, isLast }: { link: SocialLink; isFirst: boolean; isLast: boolean }) {
  const [state, action] = useActionState(updateSocialLinkAction, idleState);

  return (
    <li className={`py-3 ${link.enabled ? "" : "opacity-55"}`}>
      <div className="flex items-center gap-2">
        <div className="flex shrink-0 flex-col gap-0.5">
          <form action={moveSocialLinkAction}>
            <input type="hidden" name="id" value={link.id} />
            <input type="hidden" name="direction" value="up" />
            <SubmitButton variant="ghost" size="icon" disabled={isFirst} title="Move up" className="h-6 w-6">
              <ChevronUp />
            </SubmitButton>
          </form>
          <form action={moveSocialLinkAction}>
            <input type="hidden" name="id" value={link.id} />
            <input type="hidden" name="direction" value="down" />
            <SubmitButton variant="ghost" size="icon" disabled={isLast} title="Move down" className="h-6 w-6">
              <ChevronDown />
            </SubmitButton>
          </form>
        </div>

        <form action={action} className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:flex-nowrap">
          <input type="hidden" name="id" value={link.id} />
          <Input name="label" defaultValue={link.label} className="sm:w-40" maxLength={60} aria-label="Label" />
          <Input name="url" defaultValue={link.url} className="min-w-0 flex-1" aria-label="URL" />
          <SubmitButton size="sm" pendingLabel="Saving…">
            Save
          </SubmitButton>
        </form>

        <div className="flex shrink-0 items-center gap-1">
          <form action={toggleSocialLinkAction}>
            <input type="hidden" name="id" value={link.id} />
            <SubmitButton
              variant="ghost"
              size="icon"
              title={link.enabled ? "Hide from the site" : "Show on the site"}
            >
              {link.enabled ? <Eye /> : <EyeOff />}
            </SubmitButton>
          </form>

          <form action={deleteSocialLinkAction}>
            <input type="hidden" name="id" value={link.id} />
            <ConfirmSubmit
              message={`Remove the ${link.label} link?`}
              title="Delete"
              className="text-white/40 hover:text-red-300"
            >
              <Trash2 />
            </ConfirmSubmit>
          </form>
        </div>
      </div>

      <FormFeedback state={state} className="mt-2" />
    </li>
  );
}

export function SocialManager({ links }: { links: SocialLink[] }) {
  const [state, action] = useActionState(createSocialLinkAction, idleState);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Links"
          description="Shown in the hero, the contact band, and the footer — in this order."
        />

        {links.length === 0 ? (
          <EmptyState title="No links yet" description="Add your first profile below." />
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {links.map((link, index) => (
              <LinkRow
                key={link.id}
                link={link}
                isFirst={index === 0}
                isLast={index === links.length - 1}
              />
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="Add a link" />
        <form action={action} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
            <Field label="Label" htmlFor="new-label" error={state.fieldErrors?.label}>
              <Input id="new-label" name="label" placeholder="Vimeo" required maxLength={60} />
            </Field>
            <Field label="URL" htmlFor="new-url" error={state.fieldErrors?.url}>
              <Input id="new-url" name="url" placeholder="https://vimeo.com/…" required />
            </Field>
          </div>

          <FormFeedback state={state} />

          <SubmitButton pendingLabel="Adding…">Add link</SubmitButton>
        </form>
      </Card>
    </div>
  );
}
