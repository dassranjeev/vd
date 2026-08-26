import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { formatPostDate } from "@/components/site/PostsSection";
import { getPostBySlug, getSettings, siteOrigin } from "@/lib/content";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const [post, settings] = await Promise.all([getPostBySlug(slug), getSettings()]);

  if (!post) return { title: "Not found", robots: { index: false, follow: false } };

  const origin = siteOrigin(settings.seo.canonicalUrl);
  return {
    title: `${post.title} — ${settings.site.siteName}`,
    description: post.excerpt || settings.seo.description,
    alternates: { canonical: `/blog/${post.slug}` },
    robots: settings.seo.indexable ? undefined : { index: false, follow: false },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      url: `${origin}/blog/${post.slug}`,
      images: post.coverUrl ? [post.coverUrl] : undefined,
      publishedTime: post.publishedAt ? post.publishedAt.toISOString() : undefined,
    },
  };
}

export default async function PostPage({ params }: Params) {
  const { slug } = await params;
  const [post, settings] = await Promise.all([getPostBySlug(slug), getSettings()]);

  // getPostBySlug returns null for drafts too, so unpublished posts 404.
  if (!post) notFound();

  // Body is stored as plain text and rendered as paragraphs — never as HTML,
  // so a post can't inject markup into the site.
  const paragraphs = post.body
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  const tags = post.tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  return (
    <main className="min-h-screen bg-background px-6 py-24 md:px-12 md:py-32">
      <article className="mx-auto max-w-[720px]">
        <Link
          href="/blog"
          className="text-[10px] uppercase tracking-[0.28em] text-white/35 transition-colors hover:text-white"
        >
          ← Journal
        </Link>

        <p className="mt-10 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-white/35">
          {post.publishedAt && <span>{formatPostDate(post.publishedAt.toISOString())}</span>}
          {post.readMinutes > 0 && (
            <>
              <span aria-hidden="true" className="text-white/15">
                &middot;
              </span>
              <span>{post.readMinutes} min read</span>
            </>
          )}
        </p>

        <h1
          className="mt-3 text-3xl font-bold leading-tight tracking-tight text-white md:text-5xl"
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          {post.title}
        </h1>

        {post.excerpt && (
          <p className="mt-5 text-lg leading-relaxed text-white/55">{post.excerpt}</p>
        )}

        <div
          className="mt-8 h-px w-16"
          style={{ background: "linear-gradient(to right, #c8a97e, transparent)" }}
        />

        {post.coverUrl && (
          <div className="mt-10 overflow-hidden rounded-sm bg-neutral-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.coverUrl} alt={post.title} className="w-full object-cover" />
          </div>
        )}

        <div className="mt-10">
          {paragraphs.map((paragraph, index) => (
            <p
              key={index}
              className="mt-6 text-base leading-[1.75] text-white/70"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              {paragraph}
            </p>
          ))}
        </div>

        {tags.length > 0 && (
          <ul className="mt-12 flex flex-wrap gap-2 border-t border-white/[0.07] pt-8">
            {tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full border border-white/12 px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-white/40"
              >
                {tag}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-16 border-t border-white/[0.07] pt-8">
          <Link
            href="/"
            className="text-xs uppercase tracking-[0.2em] text-white/40 transition-colors hover:text-white"
          >
            {settings.site.siteName} →
          </Link>
        </div>
      </article>
    </main>
  );
}
