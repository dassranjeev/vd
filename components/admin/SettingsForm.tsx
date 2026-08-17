"use client";

import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";

import { resetSettingsAction, saveSettingsAction } from "@/lib/actions/settings";
import { idleState } from "@/lib/actions/types";
import { settingsFields, type FieldDef, type SettingsKey } from "@/lib/settings";

import { ConfirmSubmit, FormFeedback, SubmitButton, ToggleField } from "./form";
import { MediaInput } from "./MediaInput";
import { Card, CardHeader, Field, Input, Label, Textarea, buttonClass } from "./ui";

type EmphasisLine = { plain: string; emphasis: string; suffix: string };

/** Repeatable "What it <em>conveys</em>." rows for the About section. */
function LinesEditor({ name, value }: { name: string; value: EmphasisLine[] }) {
  const [lines, setLines] = useState<EmphasisLine[]>(
    value.length > 0 ? value : [{ plain: "", emphasis: "", suffix: "." }],
  );

  function update(index: number, patch: Partial<EmphasisLine>) {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  return (
    <div className="space-y-3">
      <div className="hidden gap-2 sm:grid sm:grid-cols-[1fr_1fr_80px_32px]">
        <Label>Lead-in</Label>
        <Label>Emphasised</Label>
        <Label>Ending</Label>
        <span />
      </div>

      {lines.map((line, index) => (
        <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_80px_32px] sm:items-center">
          <Input
            name={`${name}.plain`}
            value={line.plain}
            onChange={(event) => update(index, { plain: event.target.value })}
            placeholder="What it "
          />
          <Input
            name={`${name}.emphasis`}
            value={line.emphasis}
            onChange={(event) => update(index, { emphasis: event.target.value })}
            placeholder="conveys"
          />
          <Input
            name={`${name}.suffix`}
            value={line.suffix}
            onChange={(event) => update(index, { suffix: event.target.value })}
            placeholder="."
          />
          <button
            type="button"
            onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
            disabled={lines.length === 1}
            className={buttonClass("ghost", "icon", "text-white/40 hover:text-red-300")}
            title="Remove line"
          >
            <Trash2 />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => setLines((prev) => [...prev, { plain: "", emphasis: "", suffix: "." }])}
        className={buttonClass("secondary", "sm")}
      >
        <Plus />
        Add line
      </button>

      <p className="text-xs leading-relaxed text-white/35">
        Rendered as <span className="text-white/60">Lead-in</span>{" "}
        <em className="text-white/80">Emphasised</em>
        <span className="text-white/60">Ending</span> — the emphasised word gets the italic serif
        treatment.
      </p>
    </div>
  );
}

function renderField(field: FieldDef, value: unknown, error?: string) {
  const id = `setting-${field.name}`;

  switch (field.kind) {
    case "boolean":
      return (
        <ToggleField
          key={field.name}
          name={field.name}
          label={field.label}
          help={field.help}
          defaultChecked={Boolean(value)}
        />
      );

    case "textarea":
      return (
        <Field key={field.name} label={field.label} htmlFor={id} help={field.help} error={error}>
          <Textarea id={id} name={field.name} defaultValue={String(value ?? "")} rows={3} />
        </Field>
      );

    case "number":
      return (
        <Field key={field.name} label={field.label} htmlFor={id} help={field.help} error={error}>
          <Input
            id={id}
            name={field.name}
            type="number"
            step={field.step}
            min={field.min}
            max={field.max}
            defaultValue={String(value ?? 0)}
          />
        </Field>
      );

    case "list":
      return (
        <Field key={field.name} label={field.label} htmlFor={id} help={field.help} error={error}>
          <Textarea
            id={id}
            name={field.name}
            rows={4}
            defaultValue={Array.isArray(value) ? value.join("\n") : ""}
          />
        </Field>
      );

    case "lines":
      return (
        <Field key={field.name} label={field.label} help={field.help} error={error}>
          <LinesEditor name={field.name} value={(value as EmphasisLine[]) ?? []} />
        </Field>
      );

    case "media":
      return (
        <Field key={field.name} label={field.label} htmlFor={id} help={field.help} error={error}>
          <MediaInput id={id} name={field.name} defaultValue={String(value ?? "")} />
        </Field>
      );

    default:
      return (
        <Field key={field.name} label={field.label} htmlFor={id} help={field.help} error={error}>
          <Input
            id={id}
            name={field.name}
            defaultValue={String(value ?? "")}
            placeholder={field.placeholder}
          />
        </Field>
      );
  }
}

export function SettingsForm({
  group,
  values,
}: {
  group: SettingsKey;
  values: Record<string, unknown>;
}) {
  const [state, action] = useActionState(saveSettingsAction, idleState);
  const meta = settingsFields[group];

  const toggles = meta.fields.filter((field) => field.kind === "boolean");
  const rest = meta.fields.filter((field) => field.kind !== "boolean");

  return (
    <Card>
      <CardHeader
        title={meta.label}
        description={meta.description}
        action={
          <form action={resetSettingsAction}>
            <input type="hidden" name="group" value={group} />
            <ConfirmSubmit
              message={`Reset all ${meta.label} settings back to the built-in defaults?`}
              variant="ghost"
              size="sm"
              title="Reset to defaults"
              className="gap-1.5 text-white/40 hover:text-white"
            >
              <RotateCcw />
              Reset
            </ConfirmSubmit>
          </form>
        }
      />

      {/* `key` forces a remount when switching tabs so defaultValues refresh. */}
      <form action={action} key={group} className="space-y-5">
        <input type="hidden" name="group" value={group} />

        {rest.map((field) => renderField(field, values[field.name], state.fieldErrors?.[field.name]))}

        {toggles.length > 0 && (
          <div className="grid gap-3 border-t border-white/[0.06] pt-5 sm:grid-cols-2">
            {toggles.map((field) => renderField(field, values[field.name]))}
          </div>
        )}

        <FormFeedback state={state} />

        <SubmitButton variant="primary" pendingLabel="Saving…">
          Save {meta.label.toLowerCase()} settings
        </SubmitButton>
      </form>
    </Card>
  );
}
