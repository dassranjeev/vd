import Link from "next/link";

import { LoginForm } from "@/components/admin/LoginForm";
import { Notice } from "@/components/admin/ui";
import { isAuthConfigured } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const misconfigured = !isDatabaseConfigured || !isAuthConfigured();

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span
            className="mx-auto grid size-11 place-items-center rounded-lg bg-white text-base font-bold text-black"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            VD
          </span>
          <h1 className="mt-5 text-xl font-bold text-white">Studio CMS</h1>
          <p className="mt-1.5 text-sm text-white/40">Sign in to manage the portfolio.</p>
        </div>

        {misconfigured && (
          <div className="mb-5">
            <Notice tone="warning" title="Setup incomplete">
              {!isDatabaseConfigured && <p>DATABASE_URL is not set on this deployment.</p>}
              {!isAuthConfigured() && <p>AUTH_SECRET is missing or shorter than 16 characters.</p>}
              <p className="mt-1.5">Add them in your environment variables, then redeploy.</p>
            </Notice>
          </div>
        )}

        <LoginForm next={next ?? "/admin"} />

        <p className="mt-8 text-center text-xs text-white/30">
          <Link href="/" className="transition-colors hover:text-white/60">
            ← Back to the site
          </Link>
        </p>
      </div>
    </main>
  );
}
