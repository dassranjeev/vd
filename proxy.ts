import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";

/**
 * Gates the admin panel before any page or server action runs. (This is the
 * Next 16 `proxy` convention, previously called `middleware`.)
 *
 * Every server action re-checks the session too — this is defence in depth plus
 * a friendly redirect, not the only guard.
 */
export default async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const isLoginPage = pathname === "/admin/login";
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);

  if (session && isLoginPage) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  if (!session && !isLoginPage) {
    const url = new URL("/admin/login", request.url);
    if (pathname !== "/admin") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
