"use client";

import { useActionState } from "react";

import { changeOwnPasswordAction, updateOwnProfileAction } from "@/lib/actions/users";
import { idleState } from "@/lib/actions/types";

import { FormFeedback, SubmitButton } from "./form";
import { Card, CardHeader, Field, Input } from "./ui";

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [state, action] = useActionState(updateOwnProfileAction, idleState);

  return (
    <Card>
      <CardHeader title="Profile" description="How you're identified in the activity log." />
      <form action={action} className="space-y-4">
        <Field label="Email" htmlFor="account-email" help="Ask an administrator to change this.">
          <Input id="account-email" value={email} disabled readOnly />
        </Field>

        <Field label="Display name" htmlFor="account-name" error={state.fieldErrors?.name}>
          <Input id="account-name" name="name" defaultValue={name} required maxLength={120} />
        </Field>

        <FormFeedback state={state} />

        <SubmitButton pendingLabel="Saving…">Save profile</SubmitButton>
      </form>
    </Card>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changeOwnPasswordAction, idleState);

  return (
    <Card>
      <CardHeader title="Password" description="At least 10 characters. You stay signed in afterwards." />
      <form action={action} className="space-y-4">
        <Field
          label="Current password"
          htmlFor="current-password"
          error={state.fieldErrors?.currentPassword}
        >
          <Input
            id="current-password"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="New password" htmlFor="new-password" error={state.fieldErrors?.newPassword}>
            <Input
              id="new-password"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
            />
          </Field>

          <Field
            label="Confirm new password"
            htmlFor="confirm-password"
            error={state.fieldErrors?.confirmPassword}
          >
            <Input
              id="confirm-password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
            />
          </Field>
        </div>

        <FormFeedback state={state} />

        <SubmitButton pendingLabel="Updating…">Change password</SubmitButton>
      </form>
    </Card>
  );
}
