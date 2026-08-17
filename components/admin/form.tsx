"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

import type { ActionState } from "@/lib/actions/types";
import { cn } from "@/lib/utils";

import { buttonClass, Notice, type ButtonVariant } from "./ui";

/** Submit button that shows pending state from the enclosing <form>. */
export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  size = "md",
  className,
  formAction,
  name,
  value,
  title,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: ButtonVariant;
  size?: "sm" | "md" | "icon";
  className?: string;
  formAction?: (formData: FormData) => void | Promise<void>;
  name?: string;
  value?: string;
  title?: string;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      formAction={formAction}
      name={name}
      value={value}
      title={title}
      disabled={pending || disabled}
      onClick={onClick}
      className={buttonClass(variant, size, className)}
    >
      {pending && <Loader2 className="animate-spin" />}
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}

/**
 * Submit button guarded by a native confirm(). Used for destructive rows so a
 * mis-click can't delete content.
 */
export function ConfirmSubmit({
  message,
  children,
  variant = "ghost",
  size = "icon",
  className,
  title,
}: {
  message: string;
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: "sm" | "md" | "icon";
  className?: string;
  title?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      title={title}
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
      className={buttonClass(variant, size, className)}
    >
      {pending ? <Loader2 className="animate-spin" /> : children}
    </button>
  );
}

/** Renders the result of a server action as a success or error banner. */
export function FormFeedback({ state, className }: { state: ActionState; className?: string }) {
  if (!state.error && !state.message) return null;

  return (
    <div className={cn("admin-fade-in", className)}>
      <Notice tone={state.ok ? "success" : "danger"}>{state.ok ? state.message : state.error}</Notice>
    </div>
  );
}

/**
 * A checkbox styled as a switch. Submits as a normal form value, so it works
 * inside the same server-action forms as everything else.
 */
export function ToggleField({
  name,
  label,
  help,
  defaultChecked,
}: {
  name: string;
  label: string;
  help?: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-md border border-white/[0.08] bg-white/[0.02] px-3 py-3 transition-colors hover:border-white/15">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="peer sr-only"
      />
      {/* Track + knob (::after). Both must be siblings of the input for the
          peer-checked variant's `~` combinator to reach them. */}
      <span className="relative mt-0.5 h-4 w-7 shrink-0 rounded-full bg-white/15 transition-colors after:absolute after:top-0.5 after:left-0.5 after:h-3 after:w-3 after:rounded-full after:bg-white after:transition-transform after:content-[''] peer-checked:bg-emerald-500/80 peer-checked:after:translate-x-3 peer-focus-visible:ring-2 peer-focus-visible:ring-white/40" />
      <span className="min-w-0">
        <span className="block text-sm text-white/85">{label}</span>
        {help && <span className="mt-0.5 block text-xs leading-relaxed text-white/35">{help}</span>}
      </span>
    </label>
  );
}
