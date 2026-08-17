import { sql as raw } from "drizzle-orm";

import { getDb, media, messages, sections, socialLinks, users, videos } from "./index";
import { seedSections, seedSocialLinks, seedVideos } from "./seed-data";

/**
 * Idempotent schema + seed. Hand-written DDL (rather than drizzle-kit
 * migrations) so it can run identically from `npm run db:setup` and from the
 * serverless /api/admin/setup route, with no migration folder to bundle.
 *
 * Keep this in sync with lib/db/schema.ts. For iterative schema changes during
 * development, `npm run db:push` diffs schema.ts against the live database.
 */

/**
 * `gen_random_uuid()` is core Postgres since 13, so no `create extension
 * pgcrypto` is needed — which also avoids failing on managed providers that
 * don't grant the privilege to create extensions.
 */
export const DDL = [
  `create table if not exists users (
     id uuid primary key default gen_random_uuid(),
     email text not null,
     name text not null default '',
     password_hash text not null,
     role text not null default 'editor',
     active boolean not null default true,
     last_login_at timestamptz,
     created_at timestamptz not null default now(),
     updated_at timestamptz not null default now()
   )`,
  `create unique index if not exists users_email_key on users (email)`,

  `create table if not exists settings (
     key text primary key,
     value jsonb not null,
     updated_at timestamptz not null default now(),
     updated_by uuid
   )`,

  `create table if not exists sections (
     id uuid primary key default gen_random_uuid(),
     key text not null,
     type text not null,
     title text not null default '',
     subtitle text not null default '',
     config jsonb not null default '{}'::jsonb,
     position integer not null default 0,
     enabled boolean not null default true,
     created_at timestamptz not null default now(),
     updated_at timestamptz not null default now()
   )`,
  `create unique index if not exists sections_key_key on sections (key)`,
  `create index if not exists sections_position_idx on sections (position)`,

  `create table if not exists videos (
     id uuid primary key default gen_random_uuid(),
     title text not null,
     youtube_id text not null,
     orientation text not null default 'horizontal',
     client text not null default '',
     year text not null default '',
     role text not null default '',
     description text not null default '',
     thumbnail_url text not null default '',
     featured boolean not null default false,
     published boolean not null default true,
     position integer not null default 0,
     created_at timestamptz not null default now(),
     updated_at timestamptz not null default now()
   )`,
  `create index if not exists videos_orientation_position_idx on videos (orientation, position)`,

  `create table if not exists social_links (
     id uuid primary key default gen_random_uuid(),
     label text not null,
     url text not null,
     position integer not null default 0,
     enabled boolean not null default true,
     created_at timestamptz not null default now()
   )`,
  `create index if not exists social_links_position_idx on social_links (position)`,

  `create table if not exists media (
     id uuid primary key default gen_random_uuid(),
     url text not null,
     pathname text not null default '',
     filename text not null,
     content_type text not null default '',
     size integer not null default 0,
     alt text not null default '',
     source text not null default 'blob',
     uploaded_by uuid,
     created_at timestamptz not null default now()
   )`,
  `create index if not exists media_created_at_idx on media (created_at)`,

  `create table if not exists messages (
     id uuid primary key default gen_random_uuid(),
     name text not null,
     email text not null,
     subject text not null default '',
     body text not null,
     status text not null default 'new',
     ip text not null default '',
     user_agent text not null default '',
     created_at timestamptz not null default now()
   )`,
  `create index if not exists messages_status_created_at_idx on messages (status, created_at)`,

  `create table if not exists activity_log (
     id uuid primary key default gen_random_uuid(),
     user_id uuid,
     user_email text not null default '',
     action text not null,
     entity text not null,
     entity_id text not null default '',
     summary text not null default '',
     created_at timestamptz not null default now()
   )`,
  `create index if not exists activity_log_created_at_idx on activity_log (created_at)`,
];

export type SetupReport = {
  tablesEnsured: number;
  sectionsSeeded: number;
  videosSeeded: number;
  socialSeeded: number;
  adminCreated: boolean;
  adminEmail?: string;
  notes: string[];
};

export async function ensureSchema() {
  const db = getDb();
  for (const statement of DDL) {
    await db.execute(raw.raw(statement));
  }
  return DDL.length;
}

/**
 * Seeds the original portfolio content. Each collection is only seeded when it
 * is empty, so running setup twice never duplicates or overwrites live content.
 */
export async function seedContent() {
  const db = getDb();
  const notes: string[] = [];

  const existingSections = await db.select({ id: sections.id }).from(sections).limit(1);
  let sectionsSeeded = 0;
  if (existingSections.length === 0) {
    await db.insert(sections).values(
      seedSections.map((section, index) => ({
        key: section.key,
        type: section.type,
        title: section.title,
        subtitle: section.subtitle,
        config: section.config,
        position: index,
        enabled: true,
      })),
    );
    sectionsSeeded = seedSections.length;
  } else {
    notes.push("Sections already present — left untouched.");
  }

  const existingVideos = await db.select({ id: videos.id }).from(videos).limit(1);
  let videosSeeded = 0;
  if (existingVideos.length === 0) {
    let horizontal = 0;
    let vertical = 0;
    await db.insert(videos).values(
      seedVideos.map((video) => ({
        title: video.title,
        youtubeId: video.youtubeId,
        orientation: video.orientation,
        client: video.client ?? "",
        year: video.year ?? "",
        thumbnailUrl: video.thumbnailUrl ?? "",
        published: true,
        position: video.orientation === "vertical" ? vertical++ : horizontal++,
      })),
    );
    videosSeeded = seedVideos.length;
  } else {
    notes.push("Videos already present — left untouched.");
  }

  const existingSocial = await db.select({ id: socialLinks.id }).from(socialLinks).limit(1);
  let socialSeeded = 0;
  if (existingSocial.length === 0) {
    await db
      .insert(socialLinks)
      .values(seedSocialLinks.map((link, index) => ({ ...link, position: index })));
    socialSeeded = seedSocialLinks.length;
  } else {
    notes.push("Social links already present — left untouched.");
  }

  return { sectionsSeeded, videosSeeded, socialSeeded, notes };
}

/**
 * Creates the bootstrap administrator from ADMIN_EMAIL / ADMIN_PASSWORD.
 * Skipped entirely once any user exists, so it can't be used to escalate later.
 */
export async function ensureBootstrapAdmin() {
  const db = getDb();
  const existing = await db.select({ id: users.id }).from(users).limit(1);
  if (existing.length > 0) {
    return { created: false, email: undefined, note: "An account already exists — no admin created." };
  }

  const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "";
  const name = process.env.ADMIN_NAME ?? "Administrator";

  if (!email || !password) {
    return {
      created: false,
      email: undefined,
      note: "Set ADMIN_EMAIL and ADMIN_PASSWORD to create the first administrator.",
    };
  }
  if (password.length < 10) {
    return {
      created: false,
      email: undefined,
      note: "ADMIN_PASSWORD must be at least 10 characters.",
    };
  }

  // Imported lazily: bcryptjs is Node-only and this module is also read by
  // tooling that shouldn't need it.
  const bcrypt = (await import("bcryptjs")).default;
  await db.insert(users).values({
    email,
    name,
    role: "admin",
    passwordHash: await bcrypt.hash(password, 12),
  });

  return { created: true, email, note: `Administrator ${email} created.` };
}

export async function runSetup({ seedOnly = false } = {}): Promise<SetupReport> {
  const tablesEnsured = seedOnly ? 0 : await ensureSchema();
  const seeded = await seedContent();
  const admin = await ensureBootstrapAdmin();

  return {
    tablesEnsured,
    sectionsSeeded: seeded.sectionsSeeded,
    videosSeeded: seeded.videosSeeded,
    socialSeeded: seeded.socialSeeded,
    adminCreated: admin.created,
    adminEmail: admin.email,
    notes: [...seeded.notes, admin.note],
  };
}

/** Counts used by the dashboard and the setup route's response. */
export async function contentCounts() {
  const db = getDb();
  const [row] = await db.execute<{
    videos: number;
    published: number;
    sections: number;
    media: number;
    messages: number;
    unread: number;
    users: number;
  }>(raw`
    select
      (select count(*)::int from ${videos}) as videos,
      (select count(*)::int from ${videos} where published) as published,
      (select count(*)::int from ${sections}) as sections,
      (select count(*)::int from ${media}) as media,
      (select count(*)::int from ${messages}) as messages,
      (select count(*)::int from ${messages} where status = 'new') as unread,
      (select count(*)::int from ${users}) as users
  `);
  return (
    row ?? { videos: 0, published: 0, sections: 0, media: 0, messages: 0, unread: 0, users: 0 }
  );
}
