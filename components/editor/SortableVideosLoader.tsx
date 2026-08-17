"use client";

import dynamic from "next/dynamic";

/**
 * VideoSection is part of the public page, so it must not statically import
 * dnd-kit. This wrapper defers the chunk until an admin actually turns edit mode
 * on — visitors never download it.
 */
export const SortableVideos = dynamic(
  () => import("./SortableVideos").then((module) => module.SortableVideos),
  { ssr: false, loading: () => null },
);
