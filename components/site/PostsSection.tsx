"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { Editable } from "@/components/editor/Editable";
import { useEditor } from "@/components/editor/EditorProvider";
import { sectionConfig, type PublicPost, type PublicSection } from "@/lib/types";

const COLUMN_CLASSES: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
};

/** Fixed locale so the server and client render the same string. */
export function formatPostDate(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

export function PostsSection({
  section,
  posts,
}: {
  section: PublicSection;
  posts: PublicPost[];
}) {
  const { editing } = useEditor();
  const config = sectionConfig(section);

  if (posts.length === 0 && !editing) return null;

  const columns = COLUMN_CLASSES[config.columns ?? 3] ?? COLUMN_CLASSES[3];
  const shown = config.limit && config.limit > 0 ? posts.slice(0, config.limit) : posts;

  return (
    <section className="py-24" style={{ backgroundColor: config.background || "#000000" }}>
      {(editing || section.title || section.subtitle) && (
        <div className="mb-14 px-8 md:px-20 lg:px-32">
          <div className="mx-auto flex max-w-[1100px] items-end justify-between border-b border-white/10 pb-5">
            <h3 className="text-xs font-medium uppercase tracking-widest text-white/40">
              {section.id ? (
                <Editable
                  value={section.title}
                  target={{ kind: "section", id: section.id, field: "title" }}
                  placeholder="Journal"
                />
              ) : (
                section.title
              )}
            </h3>

            {posts.length > shown.length ? (
              <Link
                href="/blog"
                className="inline-flex items-center gap-1 text-xs tracking-widest text-white/40 transition-colors hover:text-white"
              >
                {config.ctaAllLabel || "All posts"}
                <ArrowUpRight className="size-3" />
              </Link>
            ) : (
              <span className="text-xs tracking-widest text-white/25">
                {section.id ? (
                  <Editable
                    value={section.subtitle}
                    target={{ kind: "section", id: section.id, field: "subtitle" }}
                    placeholder="Meta"
                  />
                ) : (
                  section.subtitle
                )}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="px-8 md:px-20 lg:px-32">
        {posts.length === 0 ? (
          <div className="mx-auto max-w-[1100px] rounded-lg border border-dashed border-white/15 px-6 py-16 text-center">
            <p className="text-sm text-white/60">No published posts yet</p>
            <p className="mt-2 text-xs text-white/35">
              Write one under Admin → Journal. Drafts stay private until you publish them.
            </p>
          </div>
        ) : (
          <div className={`mx-auto grid max-w-[1100px] gap-6 ${columns}`}>
            {shown.map((post, index) => (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: Math.min(index, 5) * 0.08 }}
                className="group"
              >
                <Link href={`/blog/${post.slug}`} className="block">
                  <div className="relative aspect-[16/10] overflow-hidden rounded-sm bg-neutral-900">
                    {post.coverUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={post.coverUrl}
                        alt={post.title}
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover opacity-75 transition-all duration-500 group-hover:scale-[1.03] group-hover:opacity-100"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] to-transparent" />
                    )}
                  </div>

                  <div className="mt-4">
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

                    <h4
                      className="mt-2 text-lg font-semibold leading-snug text-white/90 transition-colors group-hover:text-white"
                      style={{ fontFamily: "'Syne', sans-serif" }}
                    >
                      {post.title}
                    </h4>

                    {post.excerpt && (
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-white/45">
                        {post.excerpt}
                      </p>
                    )}
                  </div>
                </Link>
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
