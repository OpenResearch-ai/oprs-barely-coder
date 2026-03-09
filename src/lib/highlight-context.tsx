"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface HighlightState {
  postIds: string[];        // community post IDs to highlight
  sections: string[];       // section names: 'sprint', 'products', 'community'
  message: string | null;   // optional message to show on highlighted items
}

interface HighlightContextValue {
  highlight: HighlightState;
  setHighlight: (state: HighlightState) => void;
  clearHighlight: () => void;
  isPostHighlighted: (id: string) => boolean;
  isSectionHighlighted: (name: string) => boolean;
}

const HighlightContext = createContext<HighlightContextValue | null>(null);

export function HighlightProvider({ children }: { children: ReactNode }) {
  const [highlight, setHighlightState] = useState<HighlightState>({
    postIds: [],
    sections: [],
    message: null,
  });

  const setHighlight = useCallback((state: HighlightState) => {
    setHighlightState(state);
    // Auto-clear after 8 seconds
    setTimeout(() => setHighlightState({ postIds: [], sections: [], message: null }), 8000);
  }, []);

  const clearHighlight = useCallback(() => {
    setHighlightState({ postIds: [], sections: [], message: null });
  }, []);

  const isPostHighlighted = useCallback(
    (id: string) => highlight.postIds.includes(id),
    [highlight.postIds]
  );

  const isSectionHighlighted = useCallback(
    (name: string) => highlight.sections.includes(name),
    [highlight.sections]
  );

  return (
    <HighlightContext.Provider value={{ highlight, setHighlight, clearHighlight, isPostHighlighted, isSectionHighlighted }}>
      {children}
    </HighlightContext.Provider>
  );
}

export function useHighlight() {
  const ctx = useContext(HighlightContext);
  if (!ctx) throw new Error("useHighlight must be used within HighlightProvider");
  return ctx;
}

// Parse [[HL:id1,id2]] and [[HLS:section1,section2]] from AI response
export function parseHighlightCommands(text: string): {
  cleaned: string;
  postIds: string[];
  sections: string[];
} {
  const postIds: string[] = [];
  const sections: string[] = [];

  // [[HL:post-id-1,post-id-2]]
  const postMatch = text.match(/\[\[HL:([\w,\-]+)\]\]/);
  if (postMatch) {
    postIds.push(...postMatch[1].split(",").map(s => s.trim()).filter(Boolean));
  }

  // [[HLS:community,sprint]]
  const sectionMatch = text.match(/\[\[HLS:([\w,\-]+)\]\]/);
  if (sectionMatch) {
    sections.push(...sectionMatch[1].split(",").map(s => s.trim()).filter(Boolean));
  }

  // Remove commands from displayed text
  const cleaned = text
    .replace(/\[\[HL:[\w,\-]+\]\]/g, "")
    .replace(/\[\[HLS:[\w,\-]+\]\]/g, "")
    .trim();

  return { cleaned, postIds, sections };
}
