import { z } from "zod";

/**
 * Every editable singleton on the site is declared here: a Zod schema plus the
 * default value. Defaults mirror the original hard-coded design exactly, so a
 * fresh deploy (or one whose database isn't reachable) renders the same page it
 * always did — the CMS layers on top rather than replacing it.
 */

/* ─────────────────────────── site ─────────────────────────── */

export const siteSchema = z.object({
  siteName: z.string().default("Vivek Das"),
  monogram: z.string().default("VD"),
  ownerName: z.string().default("VIVEK DAS"),
  roles: z.array(z.string()).default(["Video Producer", "Editor", "Colorist"]),
  /** Which role gets the orange glow treatment. Empty = none. */
  highlightRole: z.string().default("Colorist"),
  location: z.string().default("Toronto"),
  footerCredit: z.string().default("Vivek Das"),
  maintenanceMode: z.boolean().default(false),
});

/* ─────────────────────────── hero ─────────────────────────── */

export const heroSchema = z.object({
  videoUrl: z.string().default("/hero.mp4"),
  posterUrl: z.string().default(""),
  videoBrightness: z.number().min(0).max(2).default(0.65),
  videoContrast: z.number().min(0).max(2).default(1.05),
  grainOpacity: z.number().min(0).max(1).default(0.045),
  showLightLeaks: z.boolean().default(true),
  showScrollCue: z.boolean().default(true),
  showSocialLinks: z.boolean().default(true),
});

/* ─────────────────────────── about ────────────────────────── */

export const aboutSchema = z.object({
  /** Rendered as "{plain}<em>{emphasis}</em>{suffix}", one line each. */
  lines: z
    .array(
      z.object({
        plain: z.string().default(""),
        emphasis: z.string().default(""),
        suffix: z.string().default("."),
      }),
    )
    .default([
      { plain: "What it ", emphasis: "conveys", suffix: "." },
      { plain: "How it ", emphasis: "looks", suffix: "." },
      { plain: "Whether it ", emphasis: "converts", suffix: "." },
    ]),
  closing: z.string().default("I take care of it all."),
  showRule: z.boolean().default(true),
  locationLine: z.string().default("Based in Toronto · Working Worldwide"),
});

/* ────────────────────────── contact ───────────────────────── */

export const contactSchema = z.object({
  heading: z.string().default("Let's Talk."),
  subheading: z.string().default("Available for opportunities worldwide."),
  email: z.string().default("vdascolor@gmail.com"),
  /** Show an inline enquiry form that writes to the Messages inbox. */
  showForm: z.boolean().default(false),
  formHeading: z.string().default("Or send a note"),
  showEmailButton: z.boolean().default(true),
});

/* ──────────────────────────── seo ─────────────────────────── */

export const seoSchema = z.object({
  title: z.string().default("Vivek Das — Video Producer, Colorist & Editor | Toronto"),
  description: z
    .string()
    .default(
      "Vivek Das is a Toronto-based video producer, editor, and colorist specialising in cinematic short-form and long-form storytelling for brands, documentaries, and commercial productions.",
    ),
  keywords: z
    .string()
    .default(
      "video producer Toronto, video editor Toronto, colorist Toronto, Vivek Das, cinematic video, branded content, commercial video production, 103 Creations",
    ),
  ogTitle: z.string().default("Vivek Das — Video Producer, Colorist & Editor"),
  ogDescription: z
    .string()
    .default(
      "Toronto-based video producer, editor, and colorist crafting cinematic short and long-form content for brands and documentaries.",
    ),
  ogImage: z.string().default("/opengraph.jpg"),
  canonicalUrl: z.string().default("https://vivekdas.com"),
  indexable: z.boolean().default(true),
  jobTitle: z.string().default("Video Producer, Editor & Colorist"),
  structuredData: z.boolean().default(true),
  addressLocality: z.string().default("Toronto"),
  addressRegion: z.string().default("ON"),
  addressCountry: z.string().default("CA"),
});

/* ──────────────────────── analytics ───────────────────────── */

export const analyticsSchema = z.object({
  gaMeasurementId: z.string().default(""),
  clarityProjectId: z.string().default(""),
});

/* ──────────────────────── registry ────────────────────────── */

export const settingsSchemas = {
  site: siteSchema,
  hero: heroSchema,
  about: aboutSchema,
  contact: contactSchema,
  seo: seoSchema,
  analytics: analyticsSchema,
} as const;

export type SettingsKey = keyof typeof settingsSchemas;

export const settingsKeys = Object.keys(settingsSchemas) as SettingsKey[];

export type SettingsShape = {
  [K in SettingsKey]: z.infer<(typeof settingsSchemas)[K]>;
};

/** Parse an unknown stored value, falling back to defaults field by field. */
export function parseSettings<K extends SettingsKey>(key: K, value: unknown): SettingsShape[K] {
  const schema = settingsSchemas[key];
  const result = schema.safeParse(value ?? {});
  if (result.success) return result.data as SettingsShape[K];
  return schema.parse({}) as SettingsShape[K];
}

/** The full default settings object, used before the DB has any rows. */
export function defaultSettings(): SettingsShape {
  return Object.fromEntries(
    settingsKeys.map((key) => [key, settingsSchemas[key].parse({})]),
  ) as SettingsShape;
}

/* ──────────────────── admin form metadata ─────────────────── */

export type FieldKind = "text" | "textarea" | "boolean" | "number" | "list" | "lines" | "media";

export type FieldDef = {
  name: string;
  label: string;
  kind: FieldKind;
  help?: string;
  placeholder?: string;
  step?: number;
  min?: number;
  max?: number;
};

/** Drives the generated Settings screens so adding a field is a one-liner. */
export const settingsFields: Record<SettingsKey, { label: string; description: string; fields: FieldDef[] }> = {
  site: {
    label: "Site",
    description: "Identity, headline roles, and the global kill switch.",
    fields: [
      { name: "siteName", label: "Site name", kind: "text" },
      { name: "monogram", label: "Monogram", kind: "text", help: "Shown top-left over the hero reel." },
      { name: "ownerName", label: "Hero name", kind: "text", help: "The large name across the reel." },
      { name: "roles", label: "Roles", kind: "list", help: "One per line. Rendered separated by pipes." },
      { name: "highlightRole", label: "Glowing role", kind: "text", help: "Must match one of the roles exactly." },
      { name: "location", label: "Location", kind: "text" },
      { name: "footerCredit", label: "Footer credit", kind: "text" },
      {
        name: "maintenanceMode",
        label: "Maintenance mode",
        kind: "boolean",
        help: "Replaces the public site with a holding page. The admin stays reachable.",
      },
    ],
  },
  hero: {
    label: "Hero",
    description: "The full-bleed reel and its cinematic grade.",
    fields: [
      { name: "videoUrl", label: "Background video", kind: "media", help: "MP4 in /public or a Blob URL." },
      { name: "posterUrl", label: "Poster image", kind: "media", help: "Shown while the video loads." },
      { name: "videoBrightness", label: "Brightness", kind: "number", step: 0.05, min: 0, max: 2 },
      { name: "videoContrast", label: "Contrast", kind: "number", step: 0.05, min: 0, max: 2 },
      { name: "grainOpacity", label: "Film grain", kind: "number", step: 0.005, min: 0, max: 1 },
      { name: "showLightLeaks", label: "Animated light leaks", kind: "boolean" },
      { name: "showScrollCue", label: "Scroll cue", kind: "boolean" },
      { name: "showSocialLinks", label: "Social links in hero", kind: "boolean" },
    ],
  },
  about: {
    label: "About",
    description: "The three-line emphasis block and closing statement.",
    fields: [
      { name: "lines", label: "Emphasis lines", kind: "lines" },
      { name: "closing", label: "Closing statement", kind: "text" },
      { name: "showRule", label: "Gold divider", kind: "boolean" },
      { name: "locationLine", label: "Location line", kind: "text" },
    ],
  },
  contact: {
    label: "Contact",
    description: "The closing call to action and enquiry form.",
    fields: [
      { name: "heading", label: "Heading", kind: "text" },
      { name: "subheading", label: "Subheading", kind: "text" },
      { name: "email", label: "Email address", kind: "text" },
      { name: "showEmailButton", label: "Show email button", kind: "boolean" },
      {
        name: "showForm",
        label: "Show enquiry form",
        kind: "boolean",
        help: "Submissions land in the Messages inbox.",
      },
      { name: "formHeading", label: "Form heading", kind: "text" },
    ],
  },
  seo: {
    label: "SEO",
    description: "Metadata, social cards, and structured data.",
    fields: [
      { name: "title", label: "Page title", kind: "text" },
      { name: "description", label: "Meta description", kind: "textarea" },
      { name: "keywords", label: "Keywords", kind: "textarea" },
      { name: "canonicalUrl", label: "Canonical URL", kind: "text", placeholder: "https://vivekdas.com" },
      { name: "ogTitle", label: "Social card title", kind: "text" },
      { name: "ogDescription", label: "Social card description", kind: "textarea" },
      { name: "ogImage", label: "Social card image", kind: "media" },
      { name: "indexable", label: "Allow search indexing", kind: "boolean" },
      { name: "structuredData", label: "Emit JSON-LD", kind: "boolean" },
      { name: "jobTitle", label: "Job title (JSON-LD)", kind: "text" },
      { name: "addressLocality", label: "City", kind: "text" },
      { name: "addressRegion", label: "Region", kind: "text" },
      { name: "addressCountry", label: "Country code", kind: "text" },
    ],
  },
  analytics: {
    label: "Analytics",
    description: "Tracking scripts, injected only when an ID is present.",
    fields: [
      {
        name: "gaMeasurementId",
        label: "GA4 measurement ID",
        kind: "text",
        placeholder: "G-XXXXXXXXXX",
      },
      {
        name: "clarityProjectId",
        label: "Microsoft Clarity project ID",
        kind: "text",
        placeholder: "abcdefghij",
      },
    ],
  },
};
