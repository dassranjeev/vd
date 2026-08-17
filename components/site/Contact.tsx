"use client";

import { motion } from "framer-motion";

import type { SettingsShape } from "@/lib/settings";
import type { PublicSocialLink } from "@/lib/types";

import { ContactForm } from "./ContactForm";

export function Contact({
  contact,
  social,
}: {
  contact: SettingsShape["contact"];
  social: PublicSocialLink[];
}) {
  return (
    <section className="flex flex-col items-center justify-center border-t border-white/10 px-6 py-40 text-center">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-2xl"
      >
        <h2 className="text-4xl font-bold tracking-tighter text-white md:text-7xl lg:text-8xl">
          {contact.heading}
        </h2>

        {contact.subheading && (
          <p className="mt-6 text-base tracking-wide text-white/40 md:text-lg">{contact.subheading}</p>
        )}

        {contact.showEmailButton && contact.email && (
          <a href={`mailto:${contact.email}`} className="group relative mt-12 inline-block">
            <div className="relative z-10 overflow-hidden rounded-full border border-white/20 px-6 py-4 text-xs font-medium uppercase tracking-wide text-white/80 md:tracking-widest md:text-sm">
              <span className="relative z-20 transition-colors duration-500 group-hover:text-black">
                {contact.email}
              </span>
              <div className="absolute inset-0 translate-y-[101%] bg-white transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-0" />
            </div>
          </a>
        )}

        {contact.showForm && <ContactForm heading={contact.formHeading} />}

        {social.length > 0 && (
          <div
            className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {social.map((link, index) => (
              <div key={link.url} className="flex items-center gap-8">
                {index > 0 && (
                  <span aria-hidden="true" className="text-white/15">
                    &middot;
                  </span>
                )}
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] uppercase tracking-[0.2em] text-white/35 transition-colors duration-300 hover:text-white"
                >
                  {link.label}
                </a>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </section>
  );
}
