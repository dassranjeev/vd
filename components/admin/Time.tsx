"use client";

import { useEffect, useState } from "react";

import { formatDate, relativeTime } from "@/lib/utils";

/**
 * A timestamp that is safe to hydrate.
 *
 * Both "3 minutes ago" and a locale-formatted date depend on things the server
 * cannot know: the current moment, and the reader's time zone. Rendering either
 * directly means the server HTML and the first client render disagree, which is
 * exactly the hydration error this replaces.
 *
 * So the first render on both sides is the deterministic UTC string, and the
 * relative or local form is swapped in from an effect — after hydration has
 * already matched.
 */
export function Time({
  value,
  relative = false,
  className,
}: {
  value: Date | string | null | undefined;
  /** Show "3 minutes ago" instead of an absolute timestamp. */
  relative?: boolean;
  className?: string;
}) {
  const iso =
    value instanceof Date
      ? value.toISOString()
      : typeof value === "string"
        ? value
        : undefined;

  // Identical on server and client, so hydration matches.
  const [text, setText] = useState(() => formatDate(value));

  useEffect(() => {
    if (!iso) return;
    const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setText(relative ? relativeTime(iso) : formatDate(iso, localZone));
  }, [iso, relative]);

  return (
    <time dateTime={iso} title={iso} className={className} suppressHydrationWarning>
      {text}
    </time>
  );
}
