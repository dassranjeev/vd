import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* ─────────────────────────── Users ─────────────────────────── */

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    name: text("name").notNull().default(""),
    passwordHash: text("password_hash").notNull(),
    /** "admin" can manage users + settings, "editor" can only manage content. */
    role: text("role").notNull().default("editor"),
    active: boolean("active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_key").on(t.email)],
);

/* ───────────────────────── Settings ────────────────────────── */

/**
 * Singleton content groups, one row per group ("site", "hero", "about",
 * "contact", "seo", "analytics"). Each `value` is validated against a Zod
 * schema in lib/settings.ts before it is written or read.
 */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid("updated_by"),
});

/* ───────────────────────── Sections ────────────────────────── */

/**
 * The homepage is assembled from these rows, in `position` order. Disabling a
 * row removes that band from the live site; reordering rows reorders the page.
 */
export const sections = pgTable(
  "sections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Stable slug used by the renderer, e.g. "vertical-work". */
    key: text("key").notNull(),
    /** Component to render: hero | about | videos | contact | richtext */
    type: text("type").notNull(),
    /** Eyebrow heading shown on the live site, e.g. "Vertical Videos". */
    title: text("title").notNull().default(""),
    /** Right-hand meta label, e.g. "9:16". */
    subtitle: text("subtitle").notNull().default(""),
    /** Type-specific configuration (orientation, layout, body copy, …). */
    config: jsonb("config").notNull().default({}),
    position: integer("position").notNull().default(0),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("sections_key_key").on(t.key), index("sections_position_idx").on(t.position)],
);

/* ─────────────────────────── Videos ────────────────────────── */

export const videos = pgTable(
  "videos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    /** YouTube video id, e.g. "QjF42R4Xfr0". */
    youtubeId: text("youtube_id").notNull(),
    /** "horizontal" (16:9 grid) or "vertical" (9:16 marquee). */
    orientation: text("orientation").notNull().default("horizontal"),
    client: text("client").notNull().default(""),
    year: text("year").notNull().default(""),
    role: text("role").notNull().default(""),
    description: text("description").notNull().default(""),
    /** Overrides the YouTube-derived thumbnail when set. */
    thumbnailUrl: text("thumbnail_url").notNull().default(""),
    featured: boolean("featured").notNull().default(false),
    published: boolean("published").notNull().default(true),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("videos_orientation_position_idx").on(t.orientation, t.position)],
);

/* ──────────────────────── Social links ─────────────────────── */

export const socialLinks = pgTable(
  "social_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    label: text("label").notNull(),
    url: text("url").notNull(),
    position: integer("position").notNull().default(0),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("social_links_position_idx").on(t.position)],
);

/* ─────────────────────── Media library ─────────────────────── */

export const media = pgTable(
  "media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    url: text("url").notNull(),
    /** Vercel Blob pathname, needed to delete the underlying object. */
    pathname: text("pathname").notNull().default(""),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull().default(""),
    size: integer("size").notNull().default(0),
    alt: text("alt").notNull().default(""),
    /** "blob" for uploads, "external" for pasted URLs. */
    source: text("source").notNull().default("blob"),
    uploadedBy: uuid("uploaded_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("media_created_at_idx").on(t.createdAt)],
);

/* ──────────────────── Contact submissions ─────────────────── */

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    subject: text("subject").notNull().default(""),
    body: text("body").notNull(),
    /** new | read | archived */
    status: text("status").notNull().default("new"),
    ip: text("ip").notNull().default(""),
    userAgent: text("user_agent").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("messages_status_created_at_idx").on(t.status, t.createdAt)],
);

/* ───────────────────────── Audit log ───────────────────────── */

export const activityLog = pgTable(
  "activity_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id"),
    userEmail: text("user_email").notNull().default(""),
    /** created | updated | deleted | reordered | login | logout */
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id").notNull().default(""),
    summary: text("summary").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("activity_log_created_at_idx").on(t.createdAt)],
);

export type User = typeof users.$inferSelect;
export type Section = typeof sections.$inferSelect;
export type Video = typeof videos.$inferSelect;
export type SocialLink = typeof socialLinks.$inferSelect;
export type MediaItem = typeof media.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Activity = typeof activityLog.$inferSelect;
