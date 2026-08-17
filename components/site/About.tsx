"use client";

import { motion } from "framer-motion";

import type { SettingsShape } from "@/lib/settings";

export function About({ about }: { about: SettingsShape["about"] }) {
  return (
    <section className="mx-auto max-w-5xl px-6 py-10 text-center md:py-16">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Multi-line emphasis block */}
        {about.lines.length > 0 && (
          <div className="mb-6 space-y-0.5">
            {about.lines.map((line, index) => (
              <motion.p
                key={`${line.plain}-${index}`}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: index * 0.12, ease: [0.16, 1, 0.3, 1] }}
                className="text-2xl leading-tight text-white/60 sm:text-3xl md:text-4xl lg:text-[2.6rem]"
                style={{ fontFamily: "'Syne', sans-serif", fontWeight: 300 }}
              >
                {line.plain}
                <em
                  style={{
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontStyle: "italic",
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.92)",
                  }}
                >
                  {line.emphasis}
                </em>
                {line.suffix}
              </motion.p>
            ))}
          </div>
        )}

        {/* Bold closing statement */}
        {about.closing && (
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="mb-6 text-2xl font-bold leading-tight text-white sm:text-3xl md:text-4xl lg:text-[2.6rem]"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            {about.closing}
          </motion.p>
        )}

        {/* Gold rule */}
        {about.showRule && (
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto mb-8 h-px max-w-xs origin-center"
            style={{ background: "linear-gradient(to right, transparent, #c8a97e, transparent)" }}
          />
        )}

        {about.locationLine && (
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="text-sm tracking-widest text-white/40"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {about.locationLine}
          </motion.p>
        )}
      </motion.div>
    </section>
  );
}
