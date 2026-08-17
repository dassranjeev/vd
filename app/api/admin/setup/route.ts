import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db";
import { contentCounts, runSetup } from "@/lib/db/setup";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Creates the schema, seeds the original content, and creates the first
 * administrator — without needing a local shell against the production DB.
 *
 * Authorised either by a signed-in session, or by SETUP_SECRET for the very
 * first run when no account exists yet:
 *
 *   curl -X POST https://<your-app>/api/admin/setup \
 *        -H "x-setup-secret: $SETUP_SECRET"
 */
export async function POST(request: Request) {
  // Authorise before revealing anything about the deployment's configuration.
  const secret = process.env.SETUP_SECRET;
  const provided = request.headers.get("x-setup-secret");
  const session = await getSession();

  const authorised = Boolean(session) || (Boolean(secret) && provided === secret);
  if (!authorised) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Unauthorised. Sign in first, or set SETUP_SECRET and pass it as the x-setup-secret header.",
      },
      { status: 401 },
    );
  }

  if (!isDatabaseConfigured) {
    return NextResponse.json(
      { ok: false, error: "DATABASE_URL is not set on this deployment." },
      { status: 500 },
    );
  }

  try {
    const report = await runSetup();
    return NextResponse.json({ ok: true, report, counts: await contentCounts() });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Setup failed." },
      { status: 500 },
    );
  }
}

/** Lightweight health probe — is the database reachable and initialised? */
export async function GET() {
  if (!isDatabaseConfigured) {
    return NextResponse.json({ ok: false, database: "unconfigured" }, { status: 200 });
  }
  try {
    return NextResponse.json({ ok: true, database: "ready", counts: await contentCounts() });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      database: "unreachable-or-uninitialised",
      hint: "POST to this endpoint with x-setup-secret to create the schema.",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
