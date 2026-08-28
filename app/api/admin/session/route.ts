import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Who am I? Used by the front-end editor to decide whether to show editing
 * affordances. Reads the httpOnly session cookie, so the answer can't be forged
 * by setting the client-visible hint cookie.
 *
 * Returns 200 either way — "not an editor" is a normal answer, not an error.
 */
export async function GET() {
  const session = await getSession();

  return NextResponse.json(
    session
      ? {
          editor: true,
          name: session.name,
          email: session.email,
          role: session.role,
          // Lets the admin explain up front that uploads need a Blob store,
          // rather than only failing once a file has been chosen.
          blobEnabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
        }
      : { editor: false },
    { headers: { "Cache-Control": "no-store, private" } },
  );
}
