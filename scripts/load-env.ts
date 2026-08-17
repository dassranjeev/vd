import dotenv from "dotenv";

/**
 * Loads env files for the dev-time entrypoints (setup script, drizzle-kit).
 * Next.js does this itself at runtime; these scripts run outside Next.
 *
 * Import this for its side effect *before* any module that reads process.env
 * at import time (lib/db builds its client from DATABASE_URL on load). ES
 * imports are evaluated in order, so a side-effect import guarantees the
 * variables exist first — calling dotenv.config() as a statement would run too
 * late, after all imports have already been evaluated.
 *
 * Order matches Next.js: .env.local wins over .env. dotenv never overwrites an
 * already-set variable, so loading .env.local first gives it precedence, and
 * real environment variables still beat both.
 */
dotenv.config({ path: ".env.local" });
dotenv.config();
