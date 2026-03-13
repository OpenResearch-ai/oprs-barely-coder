"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import SprintItems from "./SprintItems";
import type { Sprint, SprintItem } from "@/lib/supabase/types";

interface Props {
  sprint: Sprint | null;
  items: SprintItem[];
}

export default function OTalkCard({ sprint, items }: Props) {
  const t = useTranslations("otalk");
  const ts = useTranslations("sidebar");

  return (
    <div className="relative flex flex-col rounded-3xl overflow-hidden"
      style={{
        background: "linear-gradient(160deg, #f8faff 0%, #f5f8ff 100%)",
        border: "1px solid rgba(96,165,250,0.2)",
        boxShadow: "0 8px 40px rgba(96,165,250,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        opacity: 0.9,
      }}>

      <div className="absolute pointer-events-none overflow-hidden inset-0 rounded-3xl">
        <div style={{
          position: "absolute",
          width: "160px", height: "160px",
          background: "radial-gradient(circle, rgba(96,165,250,0.22), transparent 70%)",
          borderRadius: "50%",
          filter: "blur(40px)",
          top: "-20px", right: "-20px",
        }} />
      </div>

      <div className="relative p-7">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl overflow-hidden" style={{ boxShadow: "0 4px 16px rgba(96,165,250,0.2)" }}>
              <Image src="/otalk_logo.jpg" alt="o talk" width={48} height={48} className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="text-xl font-bold">o talk</h2>
              <p className="text-xs text-[var(--text-tertiary)]">AI Messenger</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 bg-gray-100 border border-gray-200 px-3 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
            {ts("coming_soon")}
          </span>
        </div>

        <p className="text-[15px] font-semibold text-[var(--foreground)] leading-snug mb-3">
          {t("question")}
        </p>
        <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed mb-6">
          {t("desc")}
        </p>

        <p className="text-sm text-[var(--text-tertiary)]">{t("app_review")}</p>
      </div>

      <div style={{ height: "1px", background: "linear-gradient(90deg, transparent, rgba(96,165,250,0.15), transparent)" }} />

      <div className="p-7" style={{ background: "rgba(96,165,250,0.02)" }}>
        <SprintItems items={items} product="o talk" weekLabel={sprint?.week_label} hasSprint={!!sprint}
        communityHref="/community?product=o+talk" />
      </div>
    </div>
  );
}
