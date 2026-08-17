# Vivek Das — Portfolio + Studio CMS

The portfolio site for Vivek Das (video producer, editor, colorist), rebuilt as a
**dynamic, database-backed site with its own admin panel** and deployed on Vercel.

The public design is unchanged — same hero reel, same cinematic grade, same
marquee and grid. The difference is that none of it is hard-coded any more:
every video, every line of copy, the page order itself, and all SEO metadata now
live in Postgres and are editable at `/admin`.

---

## What became dynamic

| Was hard-coded in `App.tsx` | Now edited at |
| --- | --- |
| `HORIZONTAL_VIDEOS` / `VERTICAL_VIDEOS` arrays | **Videos** — add, edit, reorder, publish/hide, feature, bulk-import |
| Section order, headings, `9:16` / `16:9` labels | **Page sections** — reorder, retitle, hide, add new bands |
| Name, roles, glowing "Colorist", location, monogram | **Content & SEO → Site** |
| Hero video, brightness/contrast, grain, light leaks | **Content & SEO → Hero** |
| "What it *conveys*." three-line block, closing line | **Content & SEO → About** |
| "Let's Talk.", email, subheading | **Content & SEO → Contact** |
| `<title>`, description, keywords, OG/Twitter cards, JSON-LD | **Content & SEO → SEO** |
| Hard-coded `G-XXXXXXXXXX` and `YOUR_CLARITY_ID` placeholders | **Content & SEO → Analytics** |
| YouTube / Instagram / LinkedIn links repeated in 3 places | **Social links** — one list, used everywhere |
| — | **Media library**, **Messages** inbox, **Team**, activity log |

---

## Admin panel

Sign in at **`/admin`**.

- **Dashboard** — content counts, recent enquiries, audit trail
- **Videos** — per-orientation ordering, draft/live state, custom thumbnails,
  paste-any-YouTube-URL input, bulk import
- **Page sections** — the homepage is assembled from these rows in order.
  Reordering them reorders the live page; disabling one removes that band.
- **Content & SEO** — six tabs of typed, validated settings with a per-tab
  "reset to defaults"
- **Social links** — reorder / hide / add
- **Media library** — uploads to Vercel Blob, or register existing `/public`
  files and external URLs
- **Messages** — contact-form submissions with read/archive states
- **Team** — admin and editor accounts (at least one active admin is always kept)
- **My account** — display name and password

Roles: **admin** manages everything including the team; **editor** manages
content only.

---

## Architecture

```
app/
  page.tsx              homepage — assembled from the `sections` table, in order
  layout.tsx            generateMetadata() reads the SEO settings group
  robots.ts sitemap.ts  also driven by settings
  admin/                the CMS (server components + server actions)
  api/
    content  videos     public read-only JSON (headless access)
    contact             contact-form intake, honeypot + per-IP throttle
    admin/upload        multipart -> Vercel Blob -> media library
    admin/setup         one-shot schema + seed, guarded by SETUP_SECRET
components/
  site/                 the public design, unchanged visually
  admin/                bespoke admin UI primitives (no component library)
lib/
  db/schema.ts          Drizzle schema (8 tables)
  db/setup.ts           idempotent DDL + seeding
  db/seed-data.ts       the original hard-coded content, used to seed AND as fallback
  settings.ts           Zod schema + defaults + admin form metadata for each group
  content.ts            cached, tagged read layer for the public site
  actions/              server actions — all mutations, all re-checking auth
  auth/session.ts       JWT session helpers (used by proxy.ts)
proxy.ts                gates /admin at the edge of the request
```

**Stack:** Next.js 16 (App Router) · React 19 · Tailwind CSS v4 ·
Drizzle ORM + Postgres · `jose` sessions · Vercel Blob · Zod.

### Three design decisions worth knowing

**1. It never renders empty.** Every public read falls back to the original
content in `lib/db/seed-data.ts`. If the database is missing, unreachable, or
not yet initialised, the site renders exactly as it did before — and
`next build` still succeeds. The admin panel says so plainly instead of the
public site breaking.

**2. Cached reads, instant invalidation.** Public reads go through
`unstable_cache` with tags; every mutation calls `updateTag` +
`revalidatePath("/")`, so an edit is live on the next request rather than after
a timer.

**3. Adding a settings field is a one-liner.** The admin forms are generated
from `settingsFields` in `lib/settings.ts`. Add a field to the Zod schema and to
that metadata array, and the input, validation, and persistence all follow.

### Database

Eight tables: `users`, `settings` (key → JSONB singletons), `sections`,
`videos`, `social_links`, `media`, `messages`, `activity_log`.

---

## Deploying to Vercel

### 1. Create a Postgres database

Any Postgres works — Neon, Vercel Postgres, Supabase, Railway. From the Vercel
dashboard: **Storage → Create → Neon (Postgres)**, which sets `DATABASE_URL`
automatically. Use the **pooled** connection string if your provider offers one.

### 2. Set environment variables

In **Project → Settings → Environment Variables**:

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | Auto-set if you provisioned via the Vercel dashboard |
| `AUTH_SECRET` | ✅ | Signs the session cookie. `openssl rand -base64 48` |
| `ADMIN_EMAIL` | ✅ | First administrator |
| `ADMIN_PASSWORD` | ✅ | Min 10 characters. Change it after first sign-in |
| `ADMIN_NAME` | | Display name |
| `SETUP_SECRET` | | Lets you initialise the DB over HTTP (see below) |
| `NEXT_PUBLIC_SITE_URL` | | Canonical URL; falls back to the Vercel domain |
| `BLOB_READ_WRITE_TOKEN` | | Auto-injected once you add a Blob store |

### 3. Deploy, then initialise the database

Import the repo into Vercel — no build configuration needed. Then run setup
**once**, either way:

```bash
# Option A — over HTTP (no local setup needed). Requires SETUP_SECRET.
curl -X POST https://<your-app>.vercel.app/api/admin/setup \
     -H "x-setup-secret: <your SETUP_SECRET>"

# Option B — locally against the remote database
DATABASE_URL="<your connection string>" \
ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run db:setup
```

This creates the tables, seeds the original portfolio content, and creates the
first administrator. It is safe to re-run: the DDL is `if not exists`, content
is only seeded into empty tables, and the admin is only created when no user
exists.

Check status any time with `GET /api/admin/setup`.

### 4. Sign in

Go to `/admin/login`, sign in, and change the bootstrap password under
**My account**.

### 5. Optional — enable uploads

**Storage → Blob → Create**, then redeploy. The Media Library switches from
URL-registration to real uploads.

---

## Local development

```bash
npm install
cp .env.example .env.local     # fill in DATABASE_URL and AUTH_SECRET
npm run db:setup               # tables + seed content + first admin
npm run dev                    # http://localhost:3000
```

| Script | Does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:setup` | Idempotent schema + seed + bootstrap admin |
| `npm run db:seed` | Seed content only |
| `npm run db:push` | Diff `lib/db/schema.ts` against the live DB (schema changes) |
| `npm run db:studio` | Drizzle Studio |

The site runs without a database — it serves the seed content and the admin
panel tells you what's missing. That makes a first deploy safe even before the
database exists.

### Changing the schema

`lib/db/schema.ts` is the source of truth for queries; `lib/db/setup.ts` holds
the matching DDL for first-time setup. **Update both.** For iterating during
development, `npm run db:push` applies schema.ts to the database directly.

---

## Public API

Read-only, published content only:

```
GET /api/content                          everything the homepage renders
GET /api/videos                           all published videos
GET /api/videos?orientation=vertical      filter by orientation
GET /api/videos?featured=1                featured only
```

---

## Notes

- **`/public/thumbnails/*.jpg` don't exist.** The original code referenced them
  and fell back to YouTube thumbnails on 404; that behaviour is preserved.
  Upload the real files via the Media Library (or clear the *Custom thumbnail*
  field on those eight vertical videos) to remove the failed requests.
- **`hero.mp4` is 14 MB** and committed to `/public`. It works, but moving it to
  Blob storage and pointing **Hero → Background video** at the Blob URL will cut
  deployment size and serve it from the CDN.
- **Maintenance mode** (Content & SEO → Site) replaces the public site with a
  holding page while leaving the admin reachable.
- Contact-form submissions are stored in the database, not emailed. Enable the
  form under **Content & SEO → Contact**; they appear under **Messages**.
