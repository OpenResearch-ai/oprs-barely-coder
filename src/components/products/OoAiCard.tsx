"use client";

import Image from "next/image";
import SprintItems from "./SprintItems";
import type { Sprint, SprintItem } from "@/lib/supabase/types";

interface Props {
  sprint: Sprint | null;
  items: SprintItem[];
}

export default function OoAiCard({ sprint, items }: Props) {
  return (
    <div className="relative flex flex-col rounded-3xl overflow-hidden"
      style={{
        background: "linear-gradient(160deg, #ffffff 0%, #f5f5ff 100%)",
        border: "1px solid rgba(71,74,255,0.15)",
        boxShadow: "0 8px 40px rgba(71,74,255,0.08), 0 1px 2px rgba(0,0,0,0.04)",
      }}>

      {/* Animated orb */}
      <div className="absolute pointer-events-none overflow-hidden inset-0 rounded-3xl">
        <div style={{
          position: "absolute",
          width: "180px", height: "180px",
          background: "radial-gradient(circle, rgba(120,50,255,0.28), rgba(165,75,255,0) 70%)",
          borderRadius: "40% 60% 50% 50%/50% 40% 60% 50%",
          filter: "blur(40px)",
          animation: "orb-path 16s linear infinite",
          mixBlendMode: "multiply",
          opacity: 0.7,
        }} />
      </div>

      {/* Product info */}
      <div className="relative p-7">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl overflow-hidden" style={{ boxShadow: "0 4px 16px rgba(71,74,255,0.2)" }}>
              <Image src="/ooai_logo.webp" alt="oo.ai" width={48} height={48} className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="text-xl font-bold">oo.ai</h2>
              <p className="text-xs text-[var(--text-tertiary)]">AI Search</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-green-600 bg-green-50 border border-green-100 px-3 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            라이브
          </span>
        </div>

        <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed mb-3">
          가장 빠른 AI 검색.
        </p>
        <p className="text-sm text-[var(--text-tertiary)] mb-6">앱스토어 네이티브앱 심사 중.</p>

        <a href="https://oo.ai" target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-white transition-all hover:opacity-90 hover:-translate-y-0.5"
          style={{ background: "linear-gradient(135deg, #474aff, #a54bff)", boxShadow: "0 4px 20px rgba(71,74,255,0.3)" }}>
          oo.ai 열기
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 9.5L9.5 2.5M9.5 2.5H4M9.5 2.5V8" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </a>
      </div>

      <div style={{ height: "1px", background: "linear-gradient(90deg, transparent, rgba(71,74,255,0.1), transparent)" }} />

      <div className="p-7" style={{ background: "rgba(71,74,255,0.02)" }}>
        <SprintItems items={items} product="oo.ai" weekLabel={sprint?.week_label} hasSprint={!!sprint}
        communityHref="/community?product=oo.ai" />
      </div>
    </div>
  );
}
