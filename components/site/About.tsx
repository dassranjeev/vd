"use client";

import { motion } from "framer-motion";

import type { SettingsShape } from "@/lib/settings";

import { AboutStatement } from "./AboutStatement";

/**
 * The standalone, full-width version of the About statement.
 *
 * The copy itself lives in AboutStatement so this band and the intro section's
 * second column stay in sync — there is one source of truth in settings.about.
 */
export function About({ about }: { about: SettingsShape["about"] }) {
  return (
    <section className="mx-auto max-w-5xl px-6 py-10 text-center md:py-16">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      >
        <AboutStatement about={about} variant="band" />
      </motion.div>
    </section>
  );
}
