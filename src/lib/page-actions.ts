"use client";

import { useEffect, useCallback } from "react";

export type PageAction =
  | { type: "navigate"; page: "community" | "products" | "about" | "profile"; locale?: string }
  | { type: "filter_community"; filter: string }
  | { type: "search_community"; query: string }
  | { type: "highlight"; postIds: string[]; sections: string[] }
  | { type: "open_write_modal"; draft?: { title?: string; content?: string; category?: string } }
  | { type: "clear_filters" }
  | { type: "update_draft"; title?: string; content?: string; category?: string };

export function dispatchPageAction(action: PageAction) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("openresearch:page-action", { detail: action }));
}

export function usePageActionListener(handler: (action: PageAction) => void) {
  const stableHandler = useCallback(handler, [handler]);
  useEffect(() => {
    const listener = (e: Event) => stableHandler((e as CustomEvent<PageAction>).detail);
    window.addEventListener("openresearch:page-action", listener);
    return () => window.removeEventListener("openresearch:page-action", listener);
  }, [stableHandler]);
}

// Tool declarations are in tool-declarations.ts (server-safe, no "use client")
