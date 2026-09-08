"use client";

import { Editable } from "@/components/editor/Editable";
import { EditableText } from "@/components/editor/EditableText";
import type { PublicSocialLink } from "@/lib/types";

export function Footer({ credit, social }: { credit: string; social: PublicSocialLink[] }) {
  return (
    <footer className="flex flex-col items-center justify-between gap-4 border-t border-white/[0.07] px-6 py-8 text-[10px] uppercase tracking-widest text-white/30 md:flex-row">
      <p>
        © {new Date().getFullYear()}{" "}
        <Editable
          value={credit}
          target={{ kind: "setting", group: "site", path: "footerCredit" }}
          placeholder="Credit"
        />
      </p>
      <div className="flex flex-wrap justify-center gap-6">
        {social.map((link) => (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-white"
          >
            <EditableText
              entity="social"
              id={link.id}
              field="label"
              value={link.label}
              placeholder="Label"
            />
          </a>
        ))}
      </div>
    </footer>
  );
}
