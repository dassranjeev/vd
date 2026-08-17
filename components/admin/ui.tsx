import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

/* ────────────────────────── primitives ───────────────────────── */

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0";

const BUTTON_VARIANTS = {
  primary: "bg-white text-black hover:bg-white/90",
  secondary: "border border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.09]",
  ghost: "text-white/60 hover:bg-white/[0.06] hover:text-white",
  danger: "border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20",
} as const;

const BUTTON_SIZES = {
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-4",
  icon: "h-8 w-8",
} as const;

export type ButtonVariant = keyof typeof BUTTON_VARIANTS;

export function buttonClass(
  variant: ButtonVariant = "secondary",
  size: keyof typeof BUTTON_SIZES = "md",
  className?: string,
) {
  return cn(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className);
}

export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: keyof typeof BUTTON_SIZES }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: keyof typeof BUTTON_SIZES }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

const CONTROL =
  "w-full rounded-md border border-white/12 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/25 transition-colors focus:border-white/35 focus:outline-none focus:ring-1 focus:ring-white/20 disabled:opacity-50";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(CONTROL, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(CONTROL, "min-h-24 resize-y leading-relaxed", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(CONTROL, "appearance-none pr-8", className)} {...props} />;
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return (
    <label
      className={cn("block text-[11px] font-medium uppercase tracking-[0.14em] text-white/45", className)}
      {...props}
    />
  );
}

/** Label + control + help/error, the standard vertical form row. */
export function Field({
  label,
  htmlFor,
  help,
  error,
  children,
  className,
}: {
  label?: string;
  htmlFor?: string;
  help?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label htmlFor={htmlFor}>{label}</Label>}
      {children}
      {error ? (
        <p className="text-xs text-red-400">{error}</p>
      ) : help ? (
        <p className="text-xs leading-relaxed text-white/35">{help}</p>
      ) : null}
    </div>
  );
}

/* ──────────────────────────── layout ─────────────────────────── */

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-lg border border-white/[0.08] bg-white/[0.02] p-5", className)}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-white">{title}</h2>
        {description && <p className="mt-1 text-xs leading-relaxed text-white/40">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.08] pb-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-white/40">{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-white/12 px-6 py-14 text-center">
      <p className="text-sm font-medium text-white/70">{title}</p>
      {description && (
        <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-white/35">{description}</p>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

/* ──────────────────────────── display ────────────────────────── */

const BADGE_TONES = {
  neutral: "border-white/15 bg-white/[0.06] text-white/60",
  success: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
  warning: "border-amber-500/25 bg-amber-500/10 text-amber-300",
  danger: "border-red-500/25 bg-red-500/10 text-red-300",
  info: "border-sky-500/25 bg-sky-500/10 text-sky-300",
} as const;

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: keyof typeof BADGE_TONES;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em]",
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatTile({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
}) {
  const body = (
    <>
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/40">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums text-white">{value}</p>
      {hint && <p className="mt-1 text-xs text-white/35">{hint}</p>}
    </>
  );

  const className =
    "block rounded-lg border border-white/[0.08] bg-white/[0.02] p-5 transition-colors";

  return href ? (
    <Link href={href} className={cn(className, "hover:border-white/20 hover:bg-white/[0.05]")}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

/** Read-only banner used when something needs the operator's attention. */
export function Notice({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "warning" | "danger" | "success";
  title?: string;
  children: ReactNode;
}) {
  const tones = {
    info: "border-sky-500/25 bg-sky-500/[0.07] text-sky-100",
    warning: "border-amber-500/25 bg-amber-500/[0.07] text-amber-100",
    danger: "border-red-500/25 bg-red-500/[0.07] text-red-100",
    success: "border-emerald-500/25 bg-emerald-500/[0.07] text-emerald-100",
  } as const;

  return (
    <div className={cn("rounded-lg border px-4 py-3 text-sm leading-relaxed", tones[tone])}>
      {title && <p className="mb-1 font-semibold">{title}</p>}
      <div className="text-[13px] opacity-90">{children}</div>
    </div>
  );
}
