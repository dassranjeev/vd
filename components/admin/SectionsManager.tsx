"use client";

import { ChevronDown, ChevronUp, Eye, EyeOff, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";

import {
  createSectionAction,
  deleteSectionAction,
  moveSectionAction,
  toggleSectionAction,
  updateSectionAction,
} from "@/lib/actions/sections";
import { idleState } from "@/lib/actions/types";
import type { Section } from "@/lib/db";

import { ConfirmSubmit, FormFeedback, SubmitButton } from "./form";
import { MediaInput } from "./MediaInput";
import { Badge, Card, CardHeader, Field, Input, Select, Textarea } from "./ui";

const TYPE_LABELS: Record<string, string> = {
  hero: "Hero reel",
  intro: "About / intro",
  gallery: "Photo gallery",
  logos: "Client logos",
  testimonials: "Testimonials",
  posts: "Blog posts",
  about: "About statement",
  videos: "Video band",
  contact: "Contact",
  richtext: "Free text",
};

const TYPE_HINTS: Record<string, string> = {
  intro: "Heading and copy are edited here, or inline on the page.",
  gallery: "Shows published photos from Admin, Photos.",
  logos: "Shows enabled logos from Admin, Clients.",
  testimonials: "Shows published quotes from Admin, Testimonials.",
  posts: "Shows published posts from Admin, Journal.",
  hero: "Content lives in Content & SEO → Hero and Site.",
  about: "Content lives in Content & SEO → About.",
  videos: "Pulls published videos matching the orientation below.",
  contact: "Content lives in Content & SEO → Contact.",
  richtext: "Type the copy here. Blank lines start a new paragraph.",
};

type Config = {
  orientation?: string;
  eyebrow?: string;
  heading?: string;
  imageUrl?: string;
  imageSide?: string;
  secondColumn?: string;
  ctaLabel?: string;
  ctaHref?: string;
  limit?: number;
  grayscale?: boolean;
  showCaptions?: boolean;
  ctaAllLabel?: string;
  layout?: string;
  background?: string;
  columns?: number;
  autoScrollSeconds?: number;
  body?: string;
};

function SectionCard({
  section,
  isFirst,
  isLast,
}: {
  section: Section;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [state, action] = useActionState(updateSectionAction, idleState);
  const [expanded, setExpanded] = useState(false);
  const config = (section.config ?? {}) as Config;
  const isVideos = section.type === "videos";

  return (
    <Card className={section.enabled ? undefined : "opacity-60"}>
      <div className="flex items-start gap-3">
        <div className="flex shrink-0 flex-col gap-0.5">
          <form action={moveSectionAction}>
            <input type="hidden" name="id" value={section.id} />
            <input type="hidden" name="direction" value="up" />
            <SubmitButton variant="ghost" size="icon" disabled={isFirst} title="Move up" className="h-6 w-6">
              <ChevronUp />
            </SubmitButton>
          </form>
          <form action={moveSectionAction}>
            <input type="hidden" name="id" value={section.id} />
            <input type="hidden" name="direction" value="down" />
            <SubmitButton variant="ghost" size="icon" disabled={isLast} title="Move down" className="h-6 w-6">
              <ChevronDown />
            </SubmitButton>
          </form>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-white">
              {section.title || TYPE_LABELS[section.type] || section.type}
            </h3>
            <Badge>{TYPE_LABELS[section.type] ?? section.type}</Badge>
            {!section.enabled && <Badge tone="neutral">Hidden</Badge>}
            {isVideos && config.orientation && (
              <Badge tone="info">{config.orientation === "vertical" ? "9:16" : "16:9"}</Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-white/35">
            <code className="text-white/45">{section.key}</code> · {TYPE_HINTS[section.type] ?? ""}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="rounded-md px-2 py-1 text-xs text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            {expanded ? "Close" : "Edit"}
          </button>

          <form action={toggleSectionAction}>
            <input type="hidden" name="id" value={section.id} />
            <SubmitButton
              variant="ghost"
              size="icon"
              title={section.enabled ? "Hide from the site" : "Show on the site"}
            >
              {section.enabled ? <Eye /> : <EyeOff />}
            </SubmitButton>
          </form>

          <form action={deleteSectionAction}>
            <input type="hidden" name="id" value={section.id} />
            <ConfirmSubmit
              message={`Remove the "${section.title || section.key}" section from the page?`}
              title="Delete section"
              className="text-white/40 hover:text-red-300"
            >
              <Trash2 />
            </ConfirmSubmit>
          </form>
        </div>
      </div>

      {expanded && (
        <form action={action} className="mt-5 space-y-5 border-t border-white/[0.06] pt-5">
          <input type="hidden" name="id" value={section.id} />

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Heading"
              htmlFor={`title-${section.id}`}
              help="The small eyebrow label above the band."
            >
              <Input id={`title-${section.id}`} name="title" defaultValue={section.title} maxLength={120} />
            </Field>
            <Field
              label="Meta label"
              htmlFor={`subtitle-${section.id}`}
              help="Right-aligned note, e.g. 9:16."
            >
              <Input
                id={`subtitle-${section.id}`}
                name="subtitle"
                defaultValue={section.subtitle}
                maxLength={60}
              />
            </Field>
          </div>

          {isVideos && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Orientation" htmlFor={`orientation-${section.id}`}>
                <Select
                  id={`orientation-${section.id}`}
                  name="config.orientation"
                  defaultValue={config.orientation ?? "horizontal"}
                >
                  <option value="horizontal">Horizontal — 16:9</option>
                  <option value="vertical">Vertical — 9:16</option>
                </Select>
              </Field>

              <Field label="Layout" htmlFor={`layout-${section.id}`}>
                <Select
                  id={`layout-${section.id}`}
                  name="config.layout"
                  defaultValue={config.layout ?? "grid"}
                >
                  <option value="grid">Static grid</option>
                  <option value="marquee">Scrolling marquee</option>
                </Select>
              </Field>

              <Field label="Grid columns" htmlFor={`columns-${section.id}`} help="Grid layout only.">
                <Select
                  id={`columns-${section.id}`}
                  name="config.columns"
                  defaultValue={String(config.columns ?? 3)}
                >
                  {[1, 2, 3, 4].map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label="Marquee loop (seconds)"
                htmlFor={`speed-${section.id}`}
                help="Marquee layout only. Higher is slower."
              >
                <Input
                  id={`speed-${section.id}`}
                  name="config.autoScrollSeconds"
                  type="number"
                  min={5}
                  max={300}
                  defaultValue={config.autoScrollSeconds ?? 40}
                />
              </Field>
            </div>
          )}

          {section.type === "richtext" && (
            <Field
              label="Body copy"
              htmlFor={`body-${section.id}`}
              help="Plain text. Leave a blank line between paragraphs."
            >
              <Textarea id={`body-${section.id}`} name="config.body" rows={6} defaultValue={config.body ?? ""} />
            </Field>
          )}

          {section.type === "intro" && (
            <>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Eyebrow" help="Small label above the heading.">
                  <Input name="config.eyebrow" defaultValue={config.eyebrow ?? ""} maxLength={120} />
                </Field>
                <Field
                  label="Second column"
                  help="Put the About statement beside the copy, a portrait, or nothing."
                >
                  <Select
                    name="config.secondColumn"
                    defaultValue={config.secondColumn ?? (config.imageUrl ? "image" : "statement")}
                  >
                    <option value="statement">About statement</option>
                    <option value="image">Portrait image</option>
                    <option value="none">Nothing (single column)</option>
                  </Select>
                </Field>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Image side" help="Portrait only.">
                  <Select name="config.imageSide" defaultValue={config.imageSide ?? "right"}>
                    <option value="right">Image on the right</option>
                    <option value="left">Image on the left</option>
                  </Select>
                </Field>
              </div>

              <Field label="Heading">
                <Input name="config.heading" defaultValue={config.heading ?? ""} maxLength={200} />
              </Field>

              <Field label="Body copy" help="Plain text. Leave a blank line between paragraphs.">
                <Textarea name="config.body" rows={6} defaultValue={config.body ?? ""} />
              </Field>

              <Field label="Portrait image" help="Optional. Shown beside the copy.">
                <MediaInput name="config.imageUrl" defaultValue={config.imageUrl ?? ""} accept="image/*" />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Button label" help="Leave blank for no button.">
                  <Input name="config.ctaLabel" defaultValue={config.ctaLabel ?? ""} maxLength={60} />
                </Field>
                <Field label="Button link" help="A URL, or #section-key.">
                  <Input name="config.ctaHref" defaultValue={config.ctaHref ?? ""} maxLength={200} />
                </Field>
              </div>
            </>
          )}
          {section.type === "gallery" && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Grid columns">
                <Select name="config.columns" defaultValue={String(config.columns ?? 3)}>
                  {[2, 3, 4].map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Captions">
                <Select name="config.showCaptions" defaultValue={config.showCaptions === false ? "false" : "true"}>
                  <option value="true">Show captions</option>
                  <option value="false">Hide captions</option>
                </Select>
              </Field>
            </div>
          )}
          {section.type === "logos" && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Logo treatment">
                <Select name="config.grayscale" defaultValue={config.grayscale === false ? "false" : "true"}>
                  <option value="true">Greyscale, colour on hover</option>
                  <option value="false">Full colour</option>
                </Select>
              </Field>
              <Field label="Loop (seconds)" help="Higher is slower.">
                <Input
                  name="config.autoScrollSeconds"
                  type="number"
                  min={5}
                  max={300}
                  defaultValue={config.autoScrollSeconds ?? 30}
                />
              </Field>
            </div>
          )}
          {section.type === "testimonials" && (
            <Field label="Columns">
              <Select name="config.columns" defaultValue={String(config.columns ?? 3)}>
                {[1, 2, 3].map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          {section.type === "posts" && (
            <div className="grid gap-5 sm:grid-cols-3">
              <Field label="Columns">
                <Select name="config.columns" defaultValue={String(config.columns ?? 3)}>
                  {[1, 2, 3].map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="How many" help="0 shows all.">
                <Input name="config.limit" type="number" min={0} max={24} defaultValue={config.limit ?? 3} />
              </Field>
              <Field label="All-posts label">
                <Input
                  name="config.ctaAllLabel"
                  defaultValue={config.ctaAllLabel ?? ""}
                  placeholder="All posts"
                  maxLength={40}
                />
              </Field>
            </div>
          )}
          <Field
            label="Background colour"
            htmlFor={`bg-${section.id}`}
            help="Any CSS colour, e.g. #0a0a0a. Leave blank for the default."
          >
            <Input
              id={`bg-${section.id}`}
              name="config.background"
              defaultValue={config.background ?? ""}
              placeholder="#0a0a0a"
              maxLength={40}
            />
          </Field>

          <FormFeedback state={state} />

          <SubmitButton variant="primary" pendingLabel="Saving…">
            Save section
          </SubmitButton>
        </form>
      )}
    </Card>
  );
}

function AddSection() {
  const [state, action] = useActionState(createSectionAction, idleState);
  const [type, setType] = useState("videos");

  return (
    <Card>
      <CardHeader
        title="Add a section"
        description="New bands are appended to the bottom of the page — move them up from there."
      />

      <form action={action} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Type" htmlFor="new-type">
            <Select
              id="new-type"
              name="type"
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              <option value="videos">Video band</option>
              <option value="intro">About / intro</option>
              <option value="gallery">Photo gallery</option>
              <option value="logos">Client logos</option>
              <option value="testimonials">Testimonials</option>
              <option value="posts">Blog posts</option>
              <option value="richtext">Free text</option>
              <option value="about">About statement</option>
              <option value="contact">Contact</option>
              <option value="hero">Hero reel</option>
            </Select>
          </Field>

          <Field label="Heading" htmlFor="new-title" error={state.fieldErrors?.title}>
            <Input id="new-title" name="title" placeholder="Documentary work" required maxLength={120} />
          </Field>

          <Field label="Meta label" htmlFor="new-subtitle">
            <Input id="new-subtitle" name="subtitle" placeholder="16:9" maxLength={60} />
          </Field>
        </div>

        {type === "videos" && (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Orientation" htmlFor="new-orientation">
              <Select id="new-orientation" name="config.orientation" defaultValue="horizontal">
                <option value="horizontal">Horizontal — 16:9</option>
                <option value="vertical">Vertical — 9:16</option>
              </Select>
            </Field>
            <Field label="Layout" htmlFor="new-layout">
              <Select id="new-layout" name="config.layout" defaultValue="grid">
                <option value="grid">Static grid</option>
                <option value="marquee">Scrolling marquee</option>
              </Select>
            </Field>
          </div>
        )}

        {type === "richtext" && (
          <Field label="Body copy" htmlFor="new-body">
            <Textarea id="new-body" name="config.body" rows={4} />
          </Field>
        )}

        <FormFeedback state={state} />

        <SubmitButton pendingLabel="Adding…">Add section</SubmitButton>
      </form>
    </Card>
  );
}

export function SectionsManager({ sections }: { sections: Section[] }) {
  return (
    <div className="space-y-4">
      {sections.map((section, index) => (
        <SectionCard
          key={section.id}
          section={section}
          isFirst={index === 0}
          isLast={index === sections.length - 1}
        />
      ))}
      <AddSection />
    </div>
  );
}
