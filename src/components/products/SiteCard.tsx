"use client";

import Image from "next/image";
import SprintItems from "./SprintItems";
import type { Sprint, SprintItem } from "@/lib/supabase/types";

interface Props {
  sprint: Sprint | null;
  items: SprintItem[];
}

export default function SiteCard({ sprint, items }: Props) {
  return (
    <div className="relative flex flex-col rounded-3xl overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #0c0c14 0%, #1a1a2e 50%, #16162a 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 12px 48px rgba(71,74,255,0.15), 0 2px 4px rgba(0,0,0,0.2)",
      }}>

      {/* Background orb */}
      <div className="absolute pointer-events-none inset-0 rounded-3xl overflow-hidden">
        <div style={{
          position: "absolute",
          width: "300px", height: "300px",
          background: "radial-gradient(circle, rgba(71,74,255,0.2), transparent 70%)",
          filter: "blur(60px)",
          top: "-50px", right: "-50px",
        }} />
        <div style={{
          position: "absolute",
          width: "200px", height: "200px",
          background: "radial-gradient(circle, rgba(165,75,255,0.15), transparent 70%)",
          filter: "blur(50px)",
          bottom: "-30px", left: "30%",
        }} />
      </div>

      <div className="relative p-8 md:flex md:gap-10">
        {/* Left */}
        <div className="md:w-1/2">
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center"
                style={{ aspectRatio: "1/1", border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)" }}>
                <Image src="/oprs_logo.jpeg" alt="OpenResearch" width={48} height={48} className="w-full h-full object-contain" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">openresearch.ai</h2>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>This website</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full"
              style={{ background: "rgba(71,74,255,0.3)", color: "#a0a3ff", border: "1px solid rgba(71,74,255,0.4)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#474aff] animate-pulse" />
              개발 중
            </span>
          </div>

          <p className="text-[15px] leading-relaxed mb-5" style={{ color: "rgba(255,255,255,0.65)" }}>
            지금 보고 있는 이 사이트 자체도 오픈리서치 작품입니다.{" "}
            <span className="font-semibold text-white">커뮤니티 피드백</span>으로 매주 개선됩니다.
          </p>

        </div>

        {/* Divider */}
        <div className="hidden md:block w-px self-stretch"
          style={{ background: "rgba(255,255,255,0.08)" }} />
        <div className="md:hidden my-6 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />

        {/* Right: Sprint — dark theme */}
        <div className="md:flex-1">
          <SprintItems
            items={items}
            product="platform"
            weekLabel={sprint?.week_label}
            hasSprint={!!sprint}
            dark
            communityHref="/community?product=platform"
          />
        </div>
      </div>
    </div>
  );
}
