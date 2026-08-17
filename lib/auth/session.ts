import { jwtVerify, SignJWT } from "jose";

/**
 * Edge-safe session helpers. This module is imported by middleware, so it must
 * stay free of Node-only dependencies (no bcrypt, no postgres, no next/headers).
 */

export const SESSION_COOKIE = "vd_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * Non-httpOnly *hint* that someone signed in on this browser. It carries no
 * privileges and is never trusted for authorisation — its only job is to let the
 * statically-cached homepage skip the session lookup for ordinary visitors.
 * The real check is always the httpOnly session cookie, server-side.
 */
export const EDITOR_HINT_COOKIE = "vd_editor";

export type SessionPayload = {
  sub: string;
  email: string;
  name: string;
  role: "admin" | "editor";
};

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET is missing or too short. Set it to a random string of at least 16 characters.",
    );
  }
  return new TextEncoder().encode(secret);
}

/** True when a signing secret is available; lets callers degrade gracefully. */
export function isAuthConfigured() {
  return Boolean(process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 16);
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT({ email: payload.email, name: payload.name, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token || !isAuthConfigured()) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      email: String(payload.email ?? ""),
      name: String(payload.name ?? ""),
      role: payload.role === "admin" ? "admin" : "editor",
    };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAge = SESSION_MAX_AGE) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}
