"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { createVideoAction, updateVideoAction } from "@/lib/actions/videos";
import { idleState } from "@/lib/actions/types";
import type { Video } from "@/lib/db";
import { extractYouTubeId, isYouTubeShortsLink } from "@/lib/utils";

import { VideoThumb } from "@/components/site/VideoThumb";

import { FormFeedback, SubmitButton, ToggleField } from "./form";
import { MediaInput } from "./MediaInput";
import { Card, Field, Input, Select, Textarea } from "./ui";

export function VideoForm({ video }: { video?: Video }) {
  const isEdit = Boolean(video);
  const [state, action] = useActionState(isEdit ? updateVideoAction : createVideoAction, idleState);

  const [link, setLink] = useState(video?.youtubeId ?? "");
  const [orientation, setOrientation] = useState(video?.orientation ?? "horizontal");
  /* Only auto-pick for a new video, and stop as soon as the editor chooses
     for themselves — silently overriding a deliberate choice is worse than
     not helping at all. */
  const [orientationChosen, setOrientationChosen] = useState(Boolean(video));
  const [autoVertical, setAutoVertical] = useState(false);

  const resolvedId = extractYouTubeId(link);
  const looksValid = /^[a-zA-Z0-9_-]{11}$/.test(resolvedId);

  return (
    <form action={action} className="space-y-6">
      {video && <input type="hidden" name="id" value={video.id} />}

      <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
        <div className="space-y-5">
          <Card>
            <div className="space-y-5">
              <Field label="Title" htmlFor="title" error={state.fieldErrors?.title}>
                <Input
                  id="title"
                  name="title"
                  defaultValue={video?.title}
                  required
                  maxLength={200}
                  placeholder="Mardi Himal Winter Trek"
                />
              </Field>

              <Field
                label="YouTube link or ID"
                htmlFor="youtubeId"
                error={state.fieldErrors?.youtubeId}
                help={
                  link && looksValid
                    ? `Resolved to ID: ${resolvedId}`
                    : "Paste any YouTube URL — watch, share, shorts, or embed — or the bare 11-character ID."
                }
              >
                <Input
                  id="youtubeId"
                  name="youtubeId"
                  value={link}
                  onChange={(event) => {
                    const next = event.target.value;
                    setLink(next);

                    // A Short is vertical by definition, so put it in the 9:16
                    // band rather than leaving it in the 16:9 default.
                    const short = isYouTubeShortsLink(next);
                    if (short && !orientationChosen) {
                      setOrientation("vertical");
                      setAutoVertical(true);
                    } else if (!short && autoVertical && !orientationChosen) {
                      setOrientation("horizontal");
                      setAutoVertical(false);
                    }
                  }}
                  required
                  placeholder="https://www.youtube.com/watch?v=…"
                />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Client" htmlFor="client">
                  <Input id="client" name="client" defaultValue={video?.client} maxLength={160} />
                </Field>
                <Field label="Year" htmlFor="year">
                  <Input id="year" name="year" defaultValue={video?.year} maxLength={20} placeholder="2024" />
                </Field>
              </div>

              <Field label="Your role" htmlFor="role" help="e.g. Colorist, Editor, Producer.">
                <Input id="role" name="role" defaultValue={video?.role} maxLength={160} />
              </Field>

              <Field
                label="Description"
                htmlFor="description"
                help="Internal notes for now — not shown on the public site."
              >
                <Textarea id="description" name="description" defaultValue={video?.description} rows={4} />
              </Field>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <div className="space-y-5">
              <Field
                label="Orientation"
                htmlFor="orientation"
                help={
                  autoVertical
                    ? "Set to vertical automatically because this is a Short. Change it if you disagree."
                    : "Vertical videos appear in the 9:16 marquee, horizontal ones in the 16:9 grid."
                }
              >
                <Select
                  id="orientation"
                  name="orientation"
                  value={orientation}
                  onChange={(event) => {
                    setOrientation(event.target.value);
                    setOrientationChosen(true);
                    setAutoVertical(false);
                  }}
                >
                  <option value="horizontal">Horizontal — 16:9</option>
                  <option value="vertical">Vertical — 9:16</option>
                </Select>
              </Field>

              <ToggleField
                name="published"
                label="Published"
                help="Unpublished videos stay hidden from the live site."
                defaultChecked={video?.published ?? true}
              />

              <ToggleField
                name="featured"
                label="Featured"
                help="Flagged for the /api/videos?featured=1 feed."
                defaultChecked={video?.featured ?? false}
              />
            </div>
          </Card>

          <Card>
            <Field
              label="Custom thumbnail"
              help="Optional. Leave blank to use YouTube's own thumbnail."
            >
              <MediaInput
                name="thumbnailUrl"
                defaultValue={video?.thumbnailUrl ?? ""}
                accept="image/*"
                placeholder="/thumbnails/name.jpg"
              />
            </Field>

            {looksValid && (
              <div className="mt-4">
                <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-white/45">
                  Thumbnail preview
                </p>
                <div
                  className={`overflow-hidden rounded-md border border-white/[0.08] bg-black ${
                    orientation === "vertical" ? "aspect-[9/16] w-32" : "aspect-video w-full"
                  }`}
                >
                  <VideoThumb
                    youtubeId={resolvedId}
                    orientation={orientation}
                    alt=""
                    loading="eager"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      <FormFeedback state={state} />

      <div className="flex items-center gap-3">
        <SubmitButton variant="primary" pendingLabel="Saving…">
          {isEdit ? "Save changes" : "Add video"}
        </SubmitButton>
        <Link
          href="/admin/videos"
          className="text-sm text-white/45 transition-colors hover:text-white"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
