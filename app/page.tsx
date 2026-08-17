import { AdminBar } from "@/components/editor/AdminBar";
import { EditorProvider } from "@/components/editor/EditorProvider";
import { SectionCanvas } from "@/components/editor/SectionCanvas";
import { About } from "@/components/site/About";
import { Analytics } from "@/components/site/Analytics";
import { Contact } from "@/components/site/Contact";
import { Footer } from "@/components/site/Footer";
import { Hero } from "@/components/site/Hero";
import { RichTextSection } from "@/components/site/RichTextSection";
import { VideoModalProvider } from "@/components/site/VideoModalProvider";
import { VideoSection } from "@/components/site/VideoSection";
import { getSiteContent, siteOrigin, type PublicSection } from "@/lib/content";

/**
 * The homepage is assembled from the `sections` table, in the order an editor
 * set in /admin/sections. Reordering, retitling, hiding a band, or adding a new
 * one is data — not a deploy.
 */
export default async function HomePage() {
  const { settings, sections, videos, social } = await getSiteContent();

  if (settings.site.maintenanceMode) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black px-6 text-center">
        <span
          className="text-2xl font-bold tracking-[-0.04em] text-white/80"
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          {settings.site.monogram}
        </span>
        <h1 className="text-3xl font-bold text-white md:text-5xl">{settings.site.siteName}</h1>
        <p className="max-w-md text-sm tracking-widest uppercase text-white/40">
          The site is being updated. Back shortly.
        </p>
        {settings.contact.email && (
          <a
            href={`mailto:${settings.contact.email}`}
            className="mt-4 text-xs uppercase tracking-[0.2em] text-white/50 underline-offset-4 hover:text-white hover:underline"
          >
            {settings.contact.email}
          </a>
        )}
      </main>
    );
  }

  function renderSectionBody(section: PublicSection) {
    switch (section.type) {
      case "hero":
        return (
          <Hero key={section.key} site={settings.site} hero={settings.hero} social={social} />
        );
      case "about":
        return <About key={section.key} about={settings.about} />;
      case "videos": {
        const orientation = String((section.config as { orientation?: string })?.orientation ?? "horizontal");
        return (
          <VideoSection
            key={section.key}
            section={section}
            videos={videos.filter((video) => video.orientation === orientation)}
          />
        );
      }
      case "contact":
        return <Contact key={section.key} contact={settings.contact} social={social} />;
      case "richtext":
        return <RichTextSection key={section.key} section={section} />;
      default:
        return null;
    }
  }

  /**
   * The bands are handed to SectionCanvas as data + pre-rendered nodes, so the
   * editor can reorder them client-side while they stay server-rendered.
   */
  const items = sections
    .map((section) => ({
      id: section.id,
      key: section.key,
      type: section.type,
      label: section.title,
      node: renderSectionBody(section),
    }))
    .filter((item) => item.node !== null);

  const jsonLd = settings.seo.structuredData
    ? {
        "@context": "https://schema.org",
        "@type": "Person",
        name: settings.site.siteName,
        jobTitle: settings.seo.jobTitle,
        description: settings.seo.description,
        url: siteOrigin(settings.seo.canonicalUrl),
        email: settings.contact.email,
        address: {
          "@type": "PostalAddress",
          addressLocality: settings.seo.addressLocality,
          addressRegion: settings.seo.addressRegion,
          addressCountry: settings.seo.addressCountry,
        },
        sameAs: social.map((link) => link.url),
      }
    : null;

  return (
    <div
      className="min-h-screen bg-background text-foreground"
      // Leaves room for the admin bar; 0px for visitors.
      style={{ paddingTop: "var(--vd-adminbar, 0px)" }}
    >
      <EditorProvider>
        <AdminBar />
        <VideoModalProvider>
          <SectionCanvas items={items} />
          <Footer credit={settings.site.footerCredit} social={social} />
        </VideoModalProvider>
      </EditorProvider>

      {jsonLd && (
        <script
          type="application/ld+json"
          // Serialised from validated settings, never from user-submitted input.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}

      <Analytics analytics={settings.analytics} />
    </div>
  );
}
