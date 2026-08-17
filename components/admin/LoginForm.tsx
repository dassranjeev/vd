"use client";

import { useActionState } from "react";

import { loginAction } from "@/lib/actions/auth";
import { idleState } from "@/lib/actions/types";

import { FormFeedback, SubmitButton } from "./form";
import { Field, Input } from "./ui";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(loginAction, idleState);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      <Field label="Email" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          placeholder="you@example.com"
        />
      </Field>

      <Field label="Password" htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••••"
        />
      </Field>

      <FormFeedback state={state} />

      <SubmitButton className="w-full" pendingLabel="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}
