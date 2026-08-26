"use client";

import { motion } from "framer-motion";

import { Editable } from "@/components/editor/Editable";
import { useEditor } from "@/components/editor/EditorProvider";
import type { SettingsShape } from "@/lib/settings";

/**
 * The "What it conveys / How it looks / Whether it converts" statement.
 *
 * Shared by two hosts so the copy has one home in settings.about regardless of
 * where it appears:
 *   - "band"  a full-width centred band of its own (the original layout)
 *   - "panel" the right-hand column of the intro section
 *
 * Both keep the same typographic language: light Syne for the lead-in, italic
 * serif for the emphasised word, bold Syne for the closing line.
 */
export function AboutStatement({
  about,
  variant = "band",
}: {
  about: SettingsShape["about"];
  variant?: "band" | "panel";
}) {
  const { editing } = useEditor();
  const panel = variant === "panel";

  const lineClass = panel
    ? "text-xl leading-[1.25] text-white/55 sm:text-2xl lg:text-[1.75rem]"
    : "text-2xl leading-tight text-white/60 sm:text-3xl md:text-4xl lg:text-[2.6rem]";

  const closingClass = panel
    ? "text-xl font-bold leading-[1.2] text-white sm:text-2xl lg:text-[1.9rem]"
    : "text-2xl font-bold leading-tight text-white sm:text-3xl md:text-4xl lg:text-[2.6rem]";

  return (
    <div
      className={
        panel
          ? "relative rounded-sm border border-white/[0.08] bg-gradient-to-br from-white/[0.045] via-white/[0.015] to-transparent p-8 lg:p-10"
          : undefined
      }
    >
      {/* Gold spine, panel only — ties the block to the section accent. */}
      {panel && (
        <span
          aria-hidden="true"
          className="absolute top-8 bottom-8 left-0 w-px"
          style={{ background: "linear-gradient(to bottom, transparent, #c8a97e, transparent)" }}
        />
      )}

      {(editing || about.lines.length > 0) && (
        <div className={panel ? "space-y-1" : "mb-6 space-y-0.5"}>
          {about.lines.map((line, index) => (
            <motion.p
              key={`${line.plain}-${index}`}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.65, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className={lineClass}
              style={{ fontFamily: "'Syne', sans-serif", fontWeight: 300 }}
            >
              <Editable
                value={line.plain}
                target={{ kind: "setting", group: "about", path: `lines.${index}.plain` }}
                placeholder="Lead-in "
              />
              <em
                style={{
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  fontStyle: "italic",
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.92)",
                }}
              >
                <Editable
                  value={line.emphasis}
                  target={{ kind: "setting", group: "about", path: `lines.${index}.emphasis` }}
                  placeholder="emphasis"
                />
              </em>
              {line.suffix}
            </motion.p>
          ))}
        </div>
      )}

      {(editing || about.closing) && (
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className={`${closingClass} ${panel ? "mt-5" : "mb-6"}`}
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          <Editable
            value={about.closing}
            target={{ kind: "setting", group: "about", path: "closing" }}
            placeholder="Closing statement"
          />
        </motion.p>
      )}

      {about.showRule && (
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className={
            panel
              ? "mt-7 h-px w-24 origin-left"
              : "mx-auto mb-8 h-px max-w-xs origin-center"
          }
          style={{
            background: panel
              ? "linear-gradient(to right, #c8a97e, transparent)"
              : "linear-gradient(to right, transparent, #c8a97e, transparent)",
          }}
        />
      )}

      {(editing || about.locationLine) && (
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.55 }}
          className={`text-xs tracking-[0.2em] text-white/40 ${panel ? "mt-5 uppercase" : "text-sm tracking-widest"}`}
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          <Editable
            value={about.locationLine}
            target={{ kind: "setting", group: "about", path: "locationLine" }}
            placeholder="Location line"
          />
        </motion.p>
      )}
    </div>
  );
}
