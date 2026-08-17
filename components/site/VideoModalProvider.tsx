"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { VideoModal } from "./VideoModal";

type ModalContext = {
  openVideo: (youtubeId: string) => void;
};

const Context = createContext<ModalContext>({ openVideo: () => {} });

export function useVideoModal() {
  return useContext(Context);
}

/**
 * Holds the lightbox for the whole page so any card — in any section, server or
 * client rendered — can open it without threading state through the tree.
 */
export function VideoModalProvider({ children }: { children: React.ReactNode }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const openVideo = useCallback((youtubeId: string) => setActiveId(youtubeId), []);
  const value = useMemo(() => ({ openVideo }), [openVideo]);

  return (
    <Context.Provider value={value}>
      {children}
      <VideoModal videoId={activeId} isOpen={Boolean(activeId)} onClose={() => setActiveId(null)} />
    </Context.Provider>
  );
}
