import React, { useState, useRef } from "react";
import { motion, useScroll, useTransform, useMotionValue, useAnimationFrame, useMotionValueEvent, animate } from "framer-motion";
import { VideoModal } from "@/components/VideoModal";


const HORIZONTAL_VIDEOS = [
  { id: "QjF42R4Xfr0", title: "Mardi Himal Winter Trek", client: "", year: "2024" },
  { id: "cZmQ75BeiAg", title: "Uncredited Colorist for 50k First Dates", client: "", year: "2024" },
  { id: "ablHt2EtEzc", title: "Mukwa Announcement Video", client: "", year: "2024" },
  { id: "h3FoYEL9R6M", title: "Happiness is a Choice", client: "", year: "2024" },
  { id: "CbpOjmJgB-k", title: "Quick Scrap Metal", client: "", year: "2024" },
  { id: "i_kYaO5wx4A", title: "Portugese TVC", client: "", year: "2024" },
  { id: "i9f1fVWJHQ0", title: "Dass Rebar Promo", client: "", year: "2024" },
  { id: "tdGXyta2AWA", title: "Letter to Myself", client: "", year: "2024" },
  { id: "ZKPPbj37VI0", title: "Colorist for Slow Rajah (Short Film)", client: "", year: "2024" },
];

const VERTICAL_VIDEOS = [
  { id: "HEeW1Gx_Qdc", title: "Ellessa Concert", client: "", year: "2024", thumbnail: "thumbnails/ellessa-concert.jpg" },
  { id: "hxedyBbO4kk", title: "Chef Raimi Mixed Grill", client: "", year: "2024", thumbnail: "thumbnails/chef-raimi-mixed-grill.jpg" },
  { id: "3hqr-gCJGUk", title: "Mirch Masala Promo", client: "", year: "2024", thumbnail: "thumbnails/mirch-masala-promo.jpg" },
  { id: "bQUvvQrf3Hs", title: "Raymond Testimonial", client: "", year: "2024", thumbnail: "thumbnails/raymond-testimonial.jpg" },
  { id: "K1_PJtJN16k", title: "FWP+ Aerial Promo", client: "", year: "2024", thumbnail: "thumbnails/fwp-aerial-promo.jpg" },
  { id: "d4xXsc9LeOY", title: "Infinite Scroll Reel", client: "", year: "2024", thumbnail: "thumbnails/infinite-scroll-reel.jpg" },
  { id: "FwWu7T4FlNw", title: "Wedding Campaign Video", client: "", year: "2024", thumbnail: "thumbnails/wedding-campaign-video.jpg" },
  { id: "HqTJIQeb69w", title: "Cozmic Cat Promo", client: "", year: "2024", thumbnail: "thumbnails/cozmic-cat-promo.jpg" },
];

export default function App() {
  const [modalVideo, setModalVideo] = useState<string | null>(null);
  const [verticalDotIdx, setVerticalDotIdx] = useState(0);
  const verticalPos = useMotionValue(0);
  const verticalPausedRef = useRef(false);
  const verticalTotal = VERTICAL_VIDEOS.length;

  useAnimationFrame((_t, dt) => {
    if (!verticalPausedRef.current)
      verticalPos.set((verticalPos.get() + dt / 5000) % verticalTotal);
  });

  useMotionValueEvent(verticalPos, 'change', (pos) => {
    const next = Math.round(pos) % verticalTotal;
    setVerticalDotIdx(prev => prev !== next ? next : prev);
  });

  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.06]);
  const nameY = useTransform(scrollYProgress, [0, 1], [0, -40]);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-white selection:text-black">
      {/* ── HERO: name lives ON the reel — one cinematic composition ── */}
      <section
        ref={heroRef}
        className="relative h-[100svh] w-full overflow-hidden bg-black"
      >
        {/* VD monogram — top left */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="absolute top-8 left-8 z-20"
        >
          <span
            className="text-white/80 font-bold tracking-[-0.04em] select-none"
            style={{ fontFamily: "'Syne', sans-serif", fontSize: "22px" }}
          >
            VD
          </span>
        </motion.div>
        {/* Hero reel — full bleed background */}
        <motion.div
          style={{ opacity: heroOpacity, scale: heroScale }}
          className="absolute inset-0 w-full h-full pointer-events-none"
        >
          <video
            src={`${import.meta.env.BASE_URL}hero.mp4`}
            autoPlay
            muted
            loop
            playsInline
            className="absolute top-1/2 left-1/2 w-full h-full -translate-x-1/2 -translate-y-1/2 object-cover"
            style={{ filter: "contrast(1.05) brightness(0.65)" }}
          />
          {/* Base gradient — darkens edges, keeps centre alive */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/20" />
        </motion.div>

        {/* Film grain overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            opacity: 0.045,
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            backgroundSize: "128px",
          }}
        />

        {/* Animated warm light leak — upper left */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          style={{
            background:
              "radial-gradient(ellipse 38% 28% at 28% 38%, rgba(180,120,40,0.10) 0%, transparent 70%)",
          }}
        />
        {/* Animated cool light leak — lower right */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          style={{
            background:
              "radial-gradient(ellipse 26% 22% at 72% 62%, rgba(50,70,180,0.08) 0%, transparent 60%)",
          }}
        />

        {/* THE NAME — overlaid on the reel, part of the frame */}
        <motion.div
          style={{ y: nameY }}
          className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 z-10 text-[color:var(--color-red-400)]"
        >
          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.4, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="font-bold tracking-[-0.03em] leading-[0.9] text-white uppercase"
            style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: "clamp(52px, 9vw, 112px)",
              mixBlendMode: "overlay",
              textShadow: "0 0 100px rgba(255,255,255,0.12)",
            }}
          >
            VIVEK DAS
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, delay: 1.0 }}
            className="mt-7 text-[11px] md:text-xs tracking-[0.32em] uppercase text-white font-light"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Video Producer &nbsp;|&nbsp; Editor &nbsp;|&nbsp;{" "}
            <span
              style={{
                color: "#fff",
                textShadow:
                  "0 0 18px rgba(255,110,30,0.95), 0 0 40px rgba(255,80,10,0.7), 0 0 80px rgba(220,60,0,0.45)",
              }}
            >
              Colorist
            </span>
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.4 }}
            className="mt-10 flex items-center gap-3"
          >
            <span
              className="text-[10px] tracking-[0.2em] uppercase text-white/80"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Toronto
            </span>
          </motion.div>
        </motion.div>

        {/* Social links — top right (hidden on mobile to avoid crowding) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="absolute top-8 right-8 hidden md:flex items-center gap-6 z-20"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          <a
            href="https://www.youtube.com/@103creations"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] tracking-[0.2em] uppercase text-white/50 hover:text-white transition-colors duration-300"
          >
            YouTube
          </a>
          <a
            href="https://www.instagram.com/vivek53_/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] tracking-[0.2em] uppercase text-white/50 hover:text-white transition-colors duration-300"
          >
            Instagram
          </a>
          <a
            href="https://www.linkedin.com/in/vdascolor/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] tracking-[0.2em] uppercase text-white/50 hover:text-white transition-colors duration-300"
          >
            LinkedIn
          </a>
        </motion.div>

        {/* Scroll cue — bottom centre */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 2.2 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center z-20"
        >
          <motion.div
            className="w-px bg-gradient-to-b from-white/40 to-transparent"
            animate={{ height: ["0px", "44px", "0px"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      </section>
      {/* ── ABOUT ── */}
      <section className="py-10 md:py-16 px-6 max-w-5xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Multi-line emphasis block */}
          <div className="mb-6 space-y-0.5">
            {[
              { plain: "What it ", key: "conveys", end: "." },
              { plain: "How it ", key: "looks", end: "." },
              { plain: "Whether it ", key: "converts", end: "." },
            ].map(({ plain, key, end }, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.6rem] leading-tight text-white/60"
                style={{ fontFamily: "'Syne', sans-serif", fontWeight: 300 }}
              >
                {plain}
                <em style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontStyle: 'italic', fontWeight: 700, color: 'rgba(255,255,255,0.92)' }}>
                  {key}
                </em>
                {end}
              </motion.p>
            ))}
          </div>

          {/* Bold closing statement */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.6rem] font-bold text-white leading-tight mb-6"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            I take care of it all.
          </motion.p>

          {/* Orange rule */}
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="origin-center h-px mb-8 mx-auto max-w-xs"
            style={{ background: 'linear-gradient(to right, transparent, #c8a97e, transparent)' }}
          />

          {/* Location */}
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="text-sm text-white/40 tracking-widest"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Based in Toronto &nbsp;·&nbsp; Working Worldwide
          </motion.p>
        </motion.div>
      </section>
      {/* ── VERTICAL WORK ── */}
      <section className="py-24 bg-[#0a0a0a]">
        {/* Header */}
        <div className="px-8 md:px-20 lg:px-32 mb-14">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="max-w-[1100px] mx-auto flex justify-between items-end border-b border-white/10 pb-5"
          >
            <h3 className="text-xs tracking-widest uppercase text-white/40 font-medium">Vertical Videos</h3>
            <span className="text-xs text-white/25 tracking-widest">9:16</span>
          </motion.div>
        </div>

        {/* Infinite marquee */}
        <div className="marquee-container overflow-hidden py-5" style={{ touchAction: "pan-y" }}>
          <div className="marquee-track flex gap-5" style={{ width: 'max-content' }}>
            {[...VERTICAL_VIDEOS, ...VERTICAL_VIDEOS].map((video, idx) => (
              <div
                key={idx}
                className="group cursor-pointer flex-shrink-0 w-[220px] transition-transform duration-500 ease-out hover:scale-[1.06]"
                onClick={() => setModalVideo(video.id)}
              >
                <div className="relative aspect-[9/16] overflow-hidden rounded-sm bg-neutral-900">
                  <img
                    src={video.thumbnail ? `${import.meta.env.BASE_URL}${video.thumbnail}` : `https://img.youtube.com/vi/${video.id}/oardefault.jpg`}
                    alt={video.title}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-500"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      if (!img.src.includes('youtube.com')) {
                        img.src = `https://img.youtube.com/vi/${video.id}/oardefault.jpg`;
                      } else {
                        img.src = `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`;
                      }
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-11 h-11 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center border border-white/25">
                      <div className="w-0 h-0 border-t-[5px] border-t-transparent border-l-[9px] border-l-white border-b-[5px] border-b-transparent ml-0.5" />
                    </div>
                  </div>
                  <div className="absolute bottom-0 inset-x-0">
                    <div className="h-10 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="bg-black/50 backdrop-blur-sm px-3 py-2">
                      <h4 className="text-sm font-light text-white/90 tracking-wide line-clamp-1" style={{ fontFamily: "'Inter', sans-serif" }}>{video.title}</h4>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-center gap-8 mt-10">
          <button
            onClick={() => animate(verticalPos, verticalPos.get() - 1, { duration: 0.7, ease: [0.16, 1, 0.3, 1] })}
            className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center text-white/50 hover:border-white/50 hover:text-white transition-all duration-300"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <div className="flex gap-2">
            {VERTICAL_VIDEOS.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  const cur = verticalPos.get();
                  const raw = i - Math.round(cur) % verticalTotal;
                  const diff = ((raw % verticalTotal) + verticalTotal + verticalTotal / 2) % verticalTotal - verticalTotal / 2;
                  animate(verticalPos, cur + diff, { duration: 0.7, ease: [0.16, 1, 0.3, 1] });
                }}
                className={`rounded-full transition-all duration-300 ${i === verticalDotIdx ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/25 hover:bg-white/50'}`}
              />
            ))}
          </div>
          <button
            onClick={() => animate(verticalPos, verticalPos.get() + 1, { duration: 0.7, ease: [0.16, 1, 0.3, 1] })}
            className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center text-white/50 hover:border-white/50 hover:text-white transition-all duration-300"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 2L10 7L5 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </section>
      {/* ── HORIZONTAL WORK ── */}
      <section className="py-24 bg-black">
        {/* Header */}
        <div className="px-8 md:px-20 lg:px-32 mb-14">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="max-w-[1100px] mx-auto flex justify-between items-end border-b border-white/10 pb-5"
          >
            <h3 className="text-xs tracking-widest uppercase text-white/40 font-medium">Horizontal Videos</h3>
            <span className="text-xs text-white/25 tracking-widest">16:9</span>
          </motion.div>
        </div>

        {/* Static grid */}
        <div className="px-8 md:px-20 lg:px-32">
          <div className="max-w-[1100px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {HORIZONTAL_VIDEOS.map((video) => (
              <div
                key={video.id}
                className="group cursor-pointer transition-transform duration-500 ease-out hover:scale-[1.06]"
                onClick={() => setModalVideo(video.id)}
              >
                <div className="relative aspect-video overflow-hidden rounded-sm bg-neutral-900">
                  <img
                    src={`https://img.youtube.com/vi/${video.id}/hqdefault.jpg`}
                    alt={video.title}
                    loading="lazy"
                    className="w-full h-full object-cover opacity-75 group-hover:opacity-100 transition-opacity duration-500"
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-12 h-12 rounded-full bg-black/55 backdrop-blur-sm flex items-center justify-center border border-white/25">
                      <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent ml-0.5" />
                    </div>
                  </div>
                  <div className="absolute bottom-0 inset-x-0">
                    <div className="h-8 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="bg-black/40 backdrop-blur-sm px-3 py-2">
                      <h4 className="text-sm font-light text-white/90 tracking-wide line-clamp-1" style={{ fontFamily: "'Inter', sans-serif" }}>{video.title}</h4>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* ── LET'S TALK ── */}
      <section className="py-40 px-6 flex flex-col items-center justify-center text-center border-t border-white/10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl"
        >
          <h2 className="text-4xl md:text-7xl lg:text-8xl font-bold tracking-tighter text-white">Let's Talk.</h2>
          <p className="mt-6 text-white/40 text-base md:text-lg tracking-wide">
            Available for opportunities worldwide.
          </p>
          <a
            href="mailto:vdascolor@gmail.com"
            className="inline-block mt-12 group relative"
          >
            <div className="relative z-10 px-6 py-4 border border-white/20 rounded-full text-white/80 uppercase tracking-wide md:tracking-widest text-xs md:text-sm font-medium overflow-hidden">
              <span className="relative z-20 group-hover:text-black transition-colors duration-500">vdascolor@gmail.com</span>
              <div className="absolute inset-0 bg-white translate-y-[101%] group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]" />
            </div>
          </a>
          <div className="mt-10 flex items-center justify-center gap-8" style={{ fontFamily: "'Inter', sans-serif" }}>
            <a href="https://www.youtube.com/@103creations" target="_blank" rel="noopener noreferrer" className="text-[10px] tracking-[0.2em] uppercase text-white/35 hover:text-white transition-colors duration-300">YouTube</a>
            <span className="text-white/15">·</span>
            <a href="https://www.instagram.com/vivek53_/" target="_blank" rel="noopener noreferrer" className="text-[10px] tracking-[0.2em] uppercase text-white/35 hover:text-white transition-colors duration-300">Instagram</a>
            <span className="text-white/15">·</span>
            <a href="https://www.linkedin.com/in/vdascolor/" target="_blank" rel="noopener noreferrer" className="text-[10px] tracking-[0.2em] uppercase text-white/35 hover:text-white transition-colors duration-300">LinkedIn</a>
          </div>
        </motion.div>
      </section>
      {/* ── FOOTER ── */}
      <footer className="py-8 px-6 border-t border-white/[0.07] flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-white/30 tracking-widest uppercase">
        <p>© {new Date().getFullYear()} Vivek Das</p>
        <div className="flex gap-6">
          <a href="https://www.instagram.com/vivek53_/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Instagram</a>
          <a href="https://www.youtube.com/@103creations" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">YouTube</a>
          <a href="https://www.linkedin.com/in/vdascolor/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">LinkedIn</a>
        </div>
      </footer>
      {/* ── MODAL ── */}
      <VideoModal
        videoId={modalVideo}
        isOpen={!!modalVideo}
        onClose={() => setModalVideo(null)}
      />
    </div>
  );
}
