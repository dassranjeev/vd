import type { Metadata } from "next";
import Link from "next/link";

import { getPosts, getSettings, siteOrigin } from "@/lib/content";
import { formatPostDate } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const { site, seo } = await getSettings();
  return {
    title: `Journal — ${site.siteName}`,
    description: `Notes and writing from ${site.siteName}.`,
    alternates: { canonical: "/blog" },
    robots: seo.indexable ? undefined : { index: false, follow: false },
    openGraph: {
      title: `Journal — ${site.siteName}`,
      url: `${siteOrigin(seo.canonicalUrl)}/blog`,
    },
  };
}

export default async function BlogIndex() {
  const [posts, settings] = await Promise.all([getPosts(), getSettings()]);

  return (
    <main className="min-h-screen bg-background px-6 py-24 md:px-12 md:py-32">
      <div className="mx-auto max-w-[900px]">
        <Link
          href="/"
          className="text-[10px] uppercase tracking-[0.28em] text-white/35 transition-colors hover:text-white"
        >
          ← {settings.site.siteName}
        </Link>

        <h1
          className="mt-8 text-4xl font-bold tracking-tight text-white md:text-6xl"
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          Journal
        </h1>

        <div
          className="mt-6 h-px w-16"
          style={{ background: "linear-gradient(to right, #c8a97e, transparent)" }}
        />

        {posts.length === 0 ? (
          <p className="mt-16 text-sm text-white/40">Nothing published yet.</p>
        ) : (
          <ul className="mt-16 space-y-12">
            {posts.map((post) => (
              <li key={post.id} className="group">
                <Link href={`/blog/${post.slug}`} className="flex flex-col gap-5 sm:flex-row">
                  {post.coverUrl && (
                    <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden rounded-sm bg-neutral-900 sm:w-56">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={post.coverUrl}
                        alt={post.title}
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover opacity-80 transition-opacity duration-500 group-hover:opacity-100"
                      />
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-white/35">
                      {post.publishedAt && <span>{formatPostDate(post.publishedAt)}</span>}
                      {post.readMinutes > 0 && (
                        <>
                          <span aria-hidden="true" className="text-white/15">
                            &middot;
                          </span>
                          <span>{post.readMinutes} min read</span>
                        </>
                      )}
                    </p>

                    <h2
                      className="mt-2 text-xl font-semibold text-white/90 transition-colors group-hover:text-white md:text-2xl"
                      style={{ fontFamily: "'Syne', sans-serif" }}
                    >
                      {post.title}
                    </h2>

                    {post.excerpt && (
                      <p className="mt-2 text-sm leading-relaxed text-white/45">{post.excerpt}</p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
