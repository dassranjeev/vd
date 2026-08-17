import "server-only";

import bcrypt from "bcryptjs";
import { eq, sql as raw } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getDb, isDatabaseConfigured, users } from "@/lib/db";

import {
  SESSION_COOKIE,
  sessionCookieOptions,
  signSession,
  verifySession,
  type SessionPayload,
} from "./session";

export { SESSION_COOKIE, isAuthConfigured } from "./session";
export type { SessionPayload } from "./session";

const BCRYPT_ROUNDS = 12;

export function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

/** Reads and verifies the current session cookie. Returns null when signed out. */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

/** Redirects to the login screen unless a valid session is present. */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

/** Like requireSession, but also demands the "admin" role. */
export async function requireAdmin(): Promise<SessionPayload> {
  const session = await requireSession();
  if (session.role !== "admin") {
    throw new Error("This action requires an administrator account.");
  }
  return session;
}

export type LoginResult = { ok: true } | { ok: false; error: string };

export async function login(email: string, password: string): Promise<LoginResult> {
  if (!isDatabaseConfigured) {
    return { ok: false, error: "No database is configured. Set DATABASE_URL and run the setup step." };
  }

  const db = getDb();
  const normalised = email.trim().toLowerCase();

  let record;
  try {
    [record] = await db.select().from(users).where(eq(users.email, normalised)).limit(1);
  } catch {
    return {
      ok: false,
      error: "Could not reach the database. Run the setup step to create the schema.",
    };
  }

  // Always run a comparison so a missing account and a wrong password take a
  // comparable amount of time.
  const hash = record?.passwordHash ?? "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv";
  const valid = await verifyPassword(password, hash);

  if (!record || !valid || !record.active) {
    return { ok: false, error: "Incorrect email or password." };
  }

  const token = await signSession({
    sub: record.id,
    email: record.email,
    name: record.name || record.email,
    role: record.role === "admin" ? "admin" : "editor",
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions());

  await db.update(users).set({ lastLoginAt: raw`now()` }).where(eq(users.id, record.id));

  return { ok: true };
}

export async function logout() {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", sessionCookieOptions(0));
}
