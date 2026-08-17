import { sectionConfig, type PublicSection } from "@/lib/types";

/**
 * A free-form copy band an editor can add anywhere in the page order. Body text
 * is rendered as plain paragraphs (split on blank lines), never as HTML, so the
 * CMS can't be used to inject markup into the public site.
 */
export function RichTextSection({ section }: { section: PublicSection }) {
  const config = sectionConfig(section);
  const body = (config.body ?? "").trim();
  const paragraphs = body
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (!section.title && paragraphs.length === 0) return null;

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
        {paragraphs.map((paragraph, index) => (
          <p
            key={index}
            className="mt-6 text-base leading-relaxed text-white/50 md:text-lg"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}
