"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

import type { SettingsShape } from "@/lib/settings";
import type { PublicSocialLink } from "@/lib/types";

export function Hero({
  site,
  hero,
  social,
}: {
  site: SettingsShape["site"];
  hero: SettingsShape["hero"];
  social: PublicSocialLink[];
}) {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.06]);
  const nameY = useTransform(scrollYProgress, [0, 1], [0, -40]);

  const roles = site.roles.filter(Boolean);

  return (
    <section ref={heroRef} className="relative h-[100svh] w-full overflow-hidden bg-black">
      {/* Monogram, top left */}
      {site.monogram && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="absolute top-8 left-8 z-20"
        >
          <span
            className="font-bold tracking-[-0.04em] text-white/80 select-none"
            style={{ fontFamily: "'Syne', sans-serif", fontSize: "22px" }}
          >
            {site.monogram}
          </span>
        </motion.div>
      )}

      {/* Hero reel, full bleed background */}
      <motion.div
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="pointer-events-none absolute inset-0 h-full w-full"
      >
        {hero.videoUrl && (
          <video
            key={hero.videoUrl}
            src={hero.videoUrl}
            poster={hero.posterUrl || undefined}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="absolute top-1/2 left-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 object-cover"
            style={{ filter: `contrast(${hero.videoContrast}) brightness(${hero.videoBrightness})` }}
          />
        )}
        {/* Darkens the edges while keeping the centre alive */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/20" />
      </motion.div>

      {/* Film grain */}
      {hero.grainOpacity > 0 && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            opacity: hero.grainOpacity,
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            backgroundSize: "128px",
          }}
        />
      )}

      {/* Animated light leaks: warm upper left, cool lower right */}
      {hero.showLightLeaks && (
        <>
          <motion.div
            className="pointer-events-none absolute inset-0"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            style={{
              background:
                "radial-gradient(ellipse 38% 28% at 28% 38%, rgba(180,120,40,0.10) 0%, transparent 70%)",
            }}
          />
          <motion.div
            className="pointer-events-none absolute inset-0"
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            style={{
              background:
                "radial-gradient(ellipse 26% 22% at 72% 62%, rgba(50,70,180,0.08) 0%, transparent 60%)",
            }}
          />
        </>
      )}

      {/* The name, overlaid on the reel as part of the frame */}
      <motion.div
        style={{ y: nameY }}
        className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center"
      >
        <motion.h1
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.4, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="font-bold uppercase leading-[0.9] tracking-[-0.03em] text-white"
          style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: "clamp(52px, 9vw, 112px)",
            mixBlendMode: "overlay",
            textShadow: "0 0 100px rgba(255,255,255,0.12)",
          }}
        >
          {site.ownerName}
        </motion.h1>

        {roles.length > 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, delay: 1.0 }}
            className="mt-7 text-[11px] font-light uppercase tracking-[0.32em] text-white md:text-xs"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {roles.map((role, index) => (
              <span key={role}>
                {index > 0 && <span className="mx-2">|</span>}
                {role === site.highlightRole ? (
                  <span
                    style={{
                      color: "#fff",
                      textShadow:
                        "0 0 18px rgba(255,110,30,0.95), 0 0 40px rgba(255,80,10,0.7), 0 0 80px rgba(220,60,0,0.45)",
                    }}
                  >
                    {role}
                  </span>
                ) : (
                  role
                )}
              </span>
            ))}
          </motion.p>
        )}

        {site.location && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.4 }}
            className="mt-10 flex items-center gap-3"
          >
            <span
              className="text-[10px] uppercase tracking-[0.2em] text-white/80"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              {site.location}
            </span>
          </motion.div>
        )}
      </motion.div>

      {/* Social links, top right. Hidden on mobile to avoid crowding. */}
      {hero.showSocialLinks && social.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="absolute top-8 right-8 z-20 hidden items-center gap-6 md:flex"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {social.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] uppercase tracking-[0.2em] text-white/50 transition-colors duration-300 hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </motion.div>
      )}

      {/* Scroll cue */}
      {hero.showScrollCue && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 2.2 }}
          className="absolute bottom-10 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center"
        >
          <motion.div
            className="w-px bg-gradient-to-b from-white/40 to-transparent"
            animate={{ height: ["0px", "44px", "0px"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      )}
    </section>
  );
}
