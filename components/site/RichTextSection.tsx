import { HtmlEditable } from "@/components/editor/HtmlEditable";
import { sectionConfig, type PublicSection } from "@/lib/types";

/**
 * A free-form copy band an editor can add anywhere in the page order.
 *
 * The body is authored as HTML source in the front-end editor and reaches this
 * component already sanitized and rendered, as `config.bodyHtml` — the
 * allowlist in lib/rich-text.ts is what keeps the CMS from being a way to
 * inject arbitrary markup into the public site.
 */
export function RichTextSection({ section }: { section: PublicSection }) {
  const config = sectionConfig(section);
  const bodySource = config.body ?? "";
  const bodyMarkup = config.bodyHtml ?? "";

  if (!section.title && !section.subtitle && !bodyMarkup) return null;

  const proseClass = "vd-prose mt-6 text-base leading-relaxed text-white/50 md:text-lg";

  return (
    <section
      className="px-6 py-24"
      style={config.background ? { backgroundColor: config.background } : undefined}
    >
      <div className="mx-auto max-w-3xl text-center">
        {section.title && (
          <h3 className="text-xs font-medium uppercase tracking-widest text-white/40">
            {section.title}
          </h3>
        )}
        {section.subtitle && (
          <p className="mt-3 text-2xl font-light text-white/80 md:text-3xl">{section.subtitle}</p>
        )}

        {section.id ? (
          <HtmlEditable
            target={{ kind: "section", id: section.id, field: "body" }}
            source={bodySource}
            html={bodyMarkup}
            placeholder="Add copy for this band. Blank lines make paragraphs."
            className={proseClass}
          />
        ) : (
          bodyMarkup && (
            <div className={proseClass} dangerouslySetInnerHTML={{ __html: bodyMarkup }} />
          )
        )}
      </div>
    </section>
  );
}
