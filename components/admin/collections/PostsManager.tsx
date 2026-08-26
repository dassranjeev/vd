"use client";

import { deletePostAction, savePostAction, togglePostAction } from "@/lib/actions/collections";
import type { Post } from "@/lib/db";
import { formatDate } from "@/lib/utils";

import { CollectionManager, type CollectionRow } from "../CollectionManager";
import { ToggleField } from "../form";
import { MediaInput } from "../MediaInput";
import { Field, Input, Textarea } from "../ui";

export function PostsManager({ posts }: { posts: Post[] }) {
  const rows: CollectionRow[] = posts.map((post) => ({
    id: post.id,
    title: post.title,
    meta: [
      `/blog/${post.slug}`,
      post.publishedAt ? formatDate(post.publishedAt) : "not published",
      post.readMinutes > 0 ? `${post.readMinutes} min` : "",
    ]
      .filter(Boolean)
      .join(" · "),
    thumbnail: post.coverUrl,
    visible: post.published,
    badges: [
      { label: post.published ? "Live" : "Draft", tone: post.published ? ("success" as const) : ("warning" as const) },
    ],
  }));

  const byId = new Map(posts.map((post) => [post.id, post]));

  return (
    <CollectionManager
      rows={rows}
      collection="posts"
      singular="Post"
      plural="Journal"
      description="Blog posts. Each gets its own page at /blog/[slug]; drafts stay private until published."
      addLabel="Write"
      saveAction={savePostAction}
      deleteAction={deletePostAction}
      toggleAction={togglePostAction}
      renderFields={(id, errors) => {
        const post = id ? byId.get(id) : undefined;
        return (
          <>
            <Field label="Title" error={errors?.title}>
              <Input name="title" defaultValue={post?.title ?? ""} required maxLength={200} />
            </Field>

            <Field
              label="URL slug"
              help={
                post
                  ? `Currently /blog/${post.slug}. Changing this breaks existing links.`
                  : "Leave blank to generate it from the title."
              }
            >
              <Input name="slug" defaultValue={post?.slug ?? ""} placeholder="grading-for-mood" />
            </Field>

            <Field label="Excerpt" help="One or two lines, shown on cards and in search results.">
              <Textarea name="excerpt" defaultValue={post?.excerpt ?? ""} rows={2} maxLength={600} />
            </Field>

            <Field
              label="Body"
              help="Plain text. Leave a blank line between paragraphs. Reading time is calculated for you."
            >
              <Textarea name="body" defaultValue={post?.body ?? ""} rows={14} className="font-mono text-[13px]" />
            </Field>

            <Field label="Cover image">
              <MediaInput name="coverUrl" defaultValue={post?.coverUrl ?? ""} accept="image/*" />
            </Field>

            <Field label="Tags" help="Comma separated.">
              <Input name="tags" defaultValue={post?.tags ?? ""} placeholder="colour, workflow" maxLength={300} />
            </Field>

            <ToggleField
              name="published"
              label="Published"
              help="The publish date is stamped the first time this goes live."
              defaultChecked={post?.published ?? false}
            />
          </>
        );
      }}
    />
  );
}
