"use client";

import { useState } from "react";

type Status = { kind: "idle" | "sending" | "sent" | "error"; message?: string };

/**
 * Posts to /api/contact, which writes into the Messages inbox in the admin.
 */
export function ContactForm({ heading }: { heading: string }) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus({ kind: "sending" });

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !payload.ok) {
        setStatus({ kind: "error", message: payload.error ?? "Something went wrong. Please email instead." });
        return;
      }
      form.reset();
      setStatus({ kind: "sent", message: "Thanks — your message is on its way." });
    } catch {
      setStatus({ kind: "error", message: "Network error. Please email instead." });
    }
  }

  const inputClass =
    "w-full rounded-sm border border-white/15 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-white/30 transition-colors focus:border-white/40 focus:outline-none";

  if (status.kind === "sent") {
    return (
      <div className="mx-auto mt-14 max-w-lg rounded-sm border border-white/15 px-6 py-8 text-center">
        <p className="text-sm tracking-wide text-white/80">{status.message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto mt-14 max-w-lg text-left">
      {heading && (
        <p className="mb-5 text-center text-[10px] uppercase tracking-[0.28em] text-white/35">
          {heading}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <input name="name" required maxLength={120} placeholder="Name" className={inputClass} />
        <input
          name="email"
          type="email"
          required
          maxLength={200}
          placeholder="Email"
          className={inputClass}
        />
      </div>
      <input
        name="subject"
        maxLength={160}
        placeholder="Subject (optional)"
        className={`${inputClass} mt-3`}
      />
      <textarea
        name="body"
        required
        rows={5}
        maxLength={4000}
        placeholder="Tell me about the project…"
        className={`${inputClass} mt-3 resize-y`}
      />

      {status.kind === "error" && (
        <p className="mt-3 text-xs text-red-400">{status.message}</p>
      )}

      <button
        type="submit"
        disabled={status.kind === "sending"}
        className="mt-5 w-full rounded-full border border-white/20 px-6 py-3.5 text-xs font-medium uppercase tracking-widest text-white/80 transition-colors duration-300 hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status.kind === "sending" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
