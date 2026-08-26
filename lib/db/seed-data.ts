/**
 * The original hard-coded portfolio content. Used twice:
 *   1. `npm run db:setup` seeds these rows into a fresh database.
 *   2. lib/content.ts falls back to them when no database is reachable, so the
 *      site never renders empty — even mid-deploy or before setup.
 */

export type SeedVideo = {
  title: string;
  youtubeId: string;
  orientation: "horizontal" | "vertical";
  client?: string;
  year?: string;
  thumbnailUrl?: string;
};

export const seedVideos: SeedVideo[] = [
  // ── 16:9 ──
  { title: "Mardi Himal Winter Trek", youtubeId: "QjF42R4Xfr0", orientation: "horizontal", year: "2024" },
  {
    title: "Uncredited Colorist for 50k First Dates",
    youtubeId: "cZmQ75BeiAg",
    orientation: "horizontal",
    year: "2024",
  },
  { title: "Mukwa Announcement Video", youtubeId: "ablHt2EtEzc", orientation: "horizontal", year: "2024" },
  { title: "Happiness is a Choice", youtubeId: "h3FoYEL9R6M", orientation: "horizontal", year: "2024" },
  { title: "Quick Scrap Metal", youtubeId: "CbpOjmJgB-k", orientation: "horizontal", year: "2024" },
  { title: "Portugese TVC", youtubeId: "i_kYaO5wx4A", orientation: "horizontal", year: "2024" },
  { title: "Dass Rebar Promo", youtubeId: "i9f1fVWJHQ0", orientation: "horizontal", year: "2024" },
  { title: "Letter to Myself", youtubeId: "tdGXyta2AWA", orientation: "horizontal", year: "2024" },
  {
    title: "Colorist for Slow Rajah (Short Film)",
    youtubeId: "ZKPPbj37VI0",
    orientation: "horizontal",
    year: "2024",
  },

  // ── 9:16 ──
  {
    title: "Ellessa Concert",
    youtubeId: "HEeW1Gx_Qdc",
    orientation: "vertical",
    year: "2024",
  },
  {
    title: "Chef Raimi Mixed Grill",
    youtubeId: "hxedyBbO4kk",
    orientation: "vertical",
    year: "2024",
  },
  {
    title: "Mirch Masala Promo",
    youtubeId: "3hqr-gCJGUk",
    orientation: "vertical",
    year: "2024",
  },
  {
    title: "Raymond Testimonial",
    youtubeId: "bQUvvQrf3Hs",
    orientation: "vertical",
    year: "2024",
  },
  {
    title: "FWP+ Aerial Promo",
    youtubeId: "K1_PJtJN16k",
    orientation: "vertical",
    year: "2024",
  },
  {
    title: "Infinite Scroll Reel",
    youtubeId: "d4xXsc9LeOY",
    orientation: "vertical",
    year: "2024",
  },
  {
    title: "Wedding Campaign Video",
    youtubeId: "FwWu7T4FlNw",
    orientation: "vertical",
    year: "2024",
  },
  {
    title: "Cozmic Cat Promo",
    youtubeId: "HqTJIQeb69w",
    orientation: "vertical",
    year: "2024",
  },
];

export const seedSocialLinks = [
  { label: "YouTube", url: "https://www.youtube.com/@103creations" },
  { label: "Instagram", url: "https://www.instagram.com/vivek53_/" },
  { label: "LinkedIn", url: "https://www.linkedin.com/in/vdascolor/" },
];

export type SeedSection = {
  key: string;
  type: string;
  title: string;
  subtitle: string;
  config: Record<string, unknown>;
};

export const seedSections: SeedSection[] = [
  { key: "hero", type: "hero", title: "", subtitle: "", config: {} },
  {
    key: "intro",
    type: "intro",
    title: "About",
    subtitle: "",
    config: {
      eyebrow: "Who I am",
      heading: "Cinematic storytelling, end to end.",
      body:
        `I produce, edit and colour work that has to earn attention -- brand films, documentaries and short-form built for the platforms they live on.

From first treatment to final grade, it stays in one pair of hands. That means fewer handoffs, a consistent look, and a film that says what you actually meant.`,
      imageSide: "right",
      secondColumn: "statement",
      ctaLabel: "See the work",
      ctaHref: "#vertical-work",
    },
  },
  { key: "about", type: "about", title: "", subtitle: "", config: {} },
  {
    key: "vertical-work",
    type: "videos",
    title: "Vertical Videos",
    subtitle: "9:16",
    config: { orientation: "vertical", layout: "marquee", background: "#0a0a0a", autoScrollSeconds: 40 },
  },
  {
    key: "horizontal-work",
    type: "videos",
    title: "Horizontal Videos",
    subtitle: "16:9",
    config: { orientation: "horizontal", layout: "grid", background: "#000000", columns: 3 },
  },
  {
    key: "gallery",
    type: "gallery",
    title: "Photos & Graphics",
    subtitle: "Stills",
    config: { columns: 3, showCaptions: true, background: "#0a0a0a" },
  },
  {
    key: "clients",
    type: "logos",
    title: "Trusted by",
    subtitle: "",
    config: { grayscale: true, autoScrollSeconds: 30, background: "#000000" },
  },
  {
    key: "testimonials",
    type: "testimonials",
    title: "What clients say",
    subtitle: "",
    config: { layout: "grid", columns: 3, background: "#0a0a0a" },
  },
  {
    key: "journal",
    type: "posts",
    title: "Journal",
    subtitle: "Notes",
    config: { columns: 3, limit: 3, ctaAllLabel: "All posts", background: "#000000" },
  },
  { key: "contact", type: "contact", title: "", subtitle: "", config: {} },
];
