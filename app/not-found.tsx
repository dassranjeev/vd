import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-black px-6 text-center">
      <p className="text-[10px] uppercase tracking-[0.32em] text-white/35">Error 404</p>
      <h1 className="text-4xl font-bold text-white md:text-6xl">Nothing here.</h1>
      <Link
        href="/"
        className="group relative mt-4 inline-block overflow-hidden rounded-full border border-white/20 px-6 py-3.5"
      >
        <span className="relative z-20 text-xs font-medium uppercase tracking-widest text-white/80 transition-colors duration-500 group-hover:text-black">
          Back to the reel
        </span>
        <span className="absolute inset-0 translate-y-[101%] bg-white transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-0" />
      </Link>
    </main>
  );
}
