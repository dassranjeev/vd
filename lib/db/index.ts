import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

export * from "./schema";

const connectionString =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.POSTGRES_PRISMA_URL ??
  "";

/** True when the app has been given a database to talk to. */
export const isDatabaseConfigured = connectionString.length > 0;

/**
 * postgres.js is reused across warm serverless invocations via globalThis so we
 * don't open a new socket per request. `max: 1` and `prepare: false` keep it
 * compatible with transaction-mode poolers (PgBouncer, Neon/Supabase pooler).
 */
const globalForDb = globalThis as unknown as {
  __vdSql?: ReturnType<typeof postgres>;
};

function createClient() {
  if (!isDatabaseConfigured) return null;
  return postgres(connectionString, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 15,
    prepare: false,
    ssl: connectionString.includes("sslmode=disable") ? false : "require",
  });
}

export const sql = globalForDb.__vdSql ?? createClient();
if (process.env.NODE_ENV !== "production" && sql) globalForDb.__vdSql = sql;

/**
 * Throws when no DATABASE_URL is present. Use in admin/mutation paths where a
 * database is mandatory. Public read paths should use `tryDb()` instead so the
 * site keeps rendering (from defaults) before the DB is provisioned.
 */
export function getDb() {
  if (!sql) {
    throw new Error(
      "DATABASE_URL is not set. Add a Postgres connection string to your environment variables.",
    );
  }
  return drizzle(sql, { schema });
}

/** Returns the Drizzle client, or null when no database is configured. */
export function tryDb() {
  return sql ? drizzle(sql, { schema }) : null;
}

export type Database = ReturnType<typeof getDb>;
