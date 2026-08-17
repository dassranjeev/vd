import Link from "next/link";

import { SettingsForm } from "@/components/admin/SettingsForm";
import { Notice, PageHeader } from "@/components/admin/ui";
import { requireSession } from "@/lib/auth";
import { getDb, isDatabaseConfigured, settings } from "@/lib/db";
import { defaultSettings, parseSettings, settingsFields, settingsKeys, type SettingsKey } from "@/lib/settings";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Reads all groups uncached — the admin must always show the true stored value. */
async function loadAll() {
  const fallback = defaultSettings();
  if (!isDatabaseConfigured) return { values: fallback, error: "no-database" as const };

  try {
    const rows = await getDb().select().from(settings);
    const byKey = new Map(rows.map((row) => [row.key, row.value]));
    const values = Object.fromEntries(
      settingsKeys.map((key) => [
        key,
        byKey.has(key) ? parseSettings(key, byKey.get(key)) : fallback[key],
      ]),
    ) as typeof fallback;
    return { values, error: null };
  } catch (error) {
    return { values: fallback, error: error instanceof Error ? error.message : "unknown" };
  }
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  await requireSession();

  const { group: requested } = await searchParams;
  const group: SettingsKey = (settingsKeys as string[]).includes(requested ?? "")
    ? (requested as SettingsKey)
    : "site";

  const { values, error } = await loadAll();

  return (
    <>
      <PageHeader
        title="Content & SEO"
        description="Every line of copy, the hero grade, metadata, and tracking — all editable here."
      />

      {error && (
        <div className="mb-6">
          <Notice tone="warning" title="Showing built-in defaults">
            {error === "no-database"
              ? "No DATABASE_URL is configured, so nothing can be saved yet."
              : "The database is unreachable or not initialised. Run the setup step before saving."}
          </Notice>
        </div>
      )}

      {/* Tabs are plain links, so they work without JavaScript. */}
      <nav className="admin-scroll mb-6 flex gap-1 overflow-x-auto border-b border-white/[0.08] pb-px">
        {settingsKeys.map((key) => (
          <Link
            key={key}
            href={`/admin/settings?group=${key}`}
            className={cn(
              "shrink-0 rounded-t-md px-4 py-2.5 text-sm transition-colors",
              key === group
                ? "border-b-2 border-white bg-white/[0.05] font-medium text-white"
                : "border-b-2 border-transparent text-white/45 hover:text-white/80",
            )}
          >
            {settingsFields[key].label}
          </Link>
        ))}
      </nav>

      <SettingsForm group={group} values={values[group] as Record<string, unknown>} />
    </>
  );
}
