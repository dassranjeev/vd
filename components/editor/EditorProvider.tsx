"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import type { ActionState } from "@/lib/actions/types";

export type EditorUser = { name: string; email: string; role: string };

export type SaveState = "idle" | "saving" | "saved" | "error";

type EditorContextValue = {
  /** Session check has finished (whatever the answer). */
  ready: boolean;
  isEditor: boolean;
  user: EditorUser | null;
  editing: boolean;
  setEditing: (value: boolean) => void;
  saveState: SaveState;
  message: string | null;
  /** Runs a server action, tracking save status. Resolves true on success. */
  run: (action: () => Promise<ActionState>) => Promise<boolean>;
  /** Re-fetch server-rendered content after a structural change. */
  refresh: () => void;
};

const EditorContext = createContext<EditorContextValue>({
  ready: false,
  isEditor: false,
  user: null,
  editing: false,
  setEditing: () => {},
  saveState: "idle",
  message: null,
  run: async () => false,
  refresh: () => {},
});

export function useEditor() {
  return useContext(EditorContext);
}

const HINT_COOKIE = "vd_editor=1";

/**
 * Detects an editing session entirely client-side, so the homepage stays
 * statically cached for the public.
 *
 * Ordinary visitors make zero extra requests: without the client-readable hint
 * cookie we never call the session endpoint. The hint grants nothing — the
 * endpoint verifies the httpOnly session cookie, and every mutation re-checks
 * auth server-side.
 */
export function EditorProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<EditorUser | null>(null);
  const [editing, setEditing] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!document.cookie.split("; ").includes(HINT_COOKIE)) {
      setReady(true);
      return;
    }

    fetch("/api/admin/session", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { editor?: boolean; name?: string; email?: string; role?: string } | null) => {
        if (cancelled) return;
        if (data?.editor) {
          setUser({ name: data.name ?? "", email: data.email ?? "", role: data.role ?? "editor" });
        }
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Leaving edit mode should never strand a "saved" flash on screen.
  useEffect(() => {
    if (!editing) {
      setSaveState("idle");
      setMessage(null);
    }
  }, [editing]);

  const run = useCallback(async (action: () => Promise<ActionState>) => {
    setSaveState("saving");
    setMessage(null);
    try {
      const result = await action();
      if (result.ok) {
        setSaveState("saved");
        setMessage(result.message ?? "Saved");
        return true;
      }
      setSaveState("error");
      setMessage(result.error ?? "Could not save.");
      return false;
    } catch {
      setSaveState("error");
      setMessage("Could not save — check your connection.");
      return false;
    }
  }, []);

  const refresh = useCallback(() => router.refresh(), [router]);

  const value = useMemo<EditorContextValue>(
    () => ({
      ready,
      isEditor: Boolean(user),
      user,
      editing: Boolean(user) && editing,
      setEditing,
      saveState,
      message,
      run,
      refresh,
    }),
    [ready, user, editing, saveState, message, run, refresh],
  );

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}
