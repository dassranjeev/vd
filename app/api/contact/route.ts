import { NextResponse } from "next/server";
import { z } from "zod";

import { getSettings } from "@/lib/content";
import { isDatabaseConfigured, getDb, messages } from "@/lib/db";

export const runtime = "nodejs";

const payloadSchema = z.object({
  name: z.string().trim().min(1, "Please add your name.").max(120),
  email: z.string().trim().email("Please use a valid email address.").max(200),
  subject: z.string().trim().max(160).optional().default(""),
  body: z.string().trim().min(10, "Tell me a little more.").max(4000),
  /** Honeypot — real users never see this field, bots fill it in. */
  website: z.string().max(0).optional(),
});

/** Naive per-IP throttle. Resets on cold start, which is fine for a portfolio. */
const recentSubmissions = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

function rateLimited(ip: string) {
  const now = Date.now();
  const hits = (recentSubmissions.get(ip) ?? []).filter((time) => now - time < WINDOW_MS);
  if (hits.length >= MAX_PER_WINDOW) return true;
  hits.push(now);
  recentSubmissions.set(ip, hits);
  return false;
}

export async function POST(request: Request) {
  const { contact } = await getSettings();
  if (!contact.showForm) {
    return NextResponse.json({ ok: false, error: "The contact form is currently closed." }, { status: 403 });
  }

  if (!isDatabaseConfigured) {
    return NextResponse.json(
      { ok: false, error: "Messaging isn't available right now — please send an email instead." },
      { status: 503 },
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (rateLimited(ip)) {
    return NextResponse.json(
      { ok: false, error: "Too many messages from this connection. Please try again later." },
      { status: 429 },
    );
  }

  let parsed;
  try {
    parsed = payloadSchema.safeParse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed request." }, { status: 400 });
  }

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." },
      { status: 400 },
    );
  }

  // Honeypot tripped: accept silently so the bot doesn't learn anything.
  if (parsed.data.website) return NextResponse.json({ ok: true });

  try {
    await getDb().insert(messages).values({
      name: parsed.data.name,
      email: parsed.data.email,
      subject: parsed.data.subject ?? "",
      body: parsed.data.body,
      ip,
      userAgent: (request.headers.get("user-agent") ?? "").slice(0, 500),
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Couldn't save your message — please send an email instead." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
