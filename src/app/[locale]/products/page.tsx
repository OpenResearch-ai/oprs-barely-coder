import { createClient } from "@/lib/supabase/server";
import { getTranslations, getLocale } from "next-intl/server";
import Image from "next/image";
import Header from "@/components/layout/Header";
import ChatBot from "@/components/chatbot/ChatBot";
import OoAiCard from "@/components/products/OoAiCard";
import OTalkCard from "@/components/products/OTalkCard";
import type { Sprint, SprintItem } from "@/lib/supabase/types";

export const revalidate = 300;

export default async function ProductsPage() {
  const supabase = await createClient();
  const t = await getTranslations("ui");
  const tNav = await getTranslations("nav");
  const tp = await getTranslations("productsPage");

  const sprintRes = await supabase
    .from("sprints")
    .select("*")
    .in("status", ["active", "draft"])
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const activeSprint = (sprintRes.data ?? null) as Sprint | null;

  let items: SprintItem[] = [];
  if (activeSprint) {
    const itemsRes = await supabase
      .from("sprint_items")
      .select("*")
      .eq("sprint_id", activeSprint.id)
      .order("priority", { ascending: true });
    items = (itemsRes.data ?? []) as SprintItem[];
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="max-w-6xl mx-auto px-4 pb-40 page-top">
        {/* Page header */}
        <div className="pt-6 pb-8">
          <p className="text-xs font-semibold tracking-widest uppercase text-[var(--purple)] mb-3 opacity-70">
            OpenResearch Products
          </p>
          <h1 className="text-4xl font-bold tracking-tight mb-1">{tNav("products_sprint")}</h1>
          <p className="text-2xl font-bold text-[var(--text-secondary)] mb-3"
            style={{ fontFeatureSettings: '"ss01"' }}>
            {t("products_tagline")}
          </p>
          <p className="text-sm text-[var(--text-tertiary)]">
            {tp("build_in_public")}
          </p>
        </div>

        {/* Sprint AI summary */}
        {activeSprint?.ai_summary && (
          <div className="flex gap-3 p-5 mb-8 rounded-2xl"
            style={{
              background: "linear-gradient(135deg, #f0f0ff 0%, #f8f0ff 100%)",
              border: "1px solid rgba(71,74,255,0.12)",
            }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: "linear-gradient(135deg, #474aff, #a54bff)" }}>
              <span className="text-white text-[9px] font-bold">AI</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-bold text-[var(--purple)]">{activeSprint.week_label} {tp("sprint_suffix")}</span>
                <span className="text-[10px] text-[var(--text-tertiary)]">
                  · {activeSprint.total_posts_analyzed}개 포스트 · {activeSprint.total_votes_counted}표
                </span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "#3c3f8f" }}>
                {activeSprint.ai_summary}
              </p>
            </div>
          </div>
        )}

        {/* 대표작 — oo.ai + o talk 상단 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <OoAiCard sprint={activeSprint} items={items} />
          <OTalkCard sprint={activeSprint} items={items} />
        </div>

        {/* Vibes */}
        <div className="mt-12">
          <div className="flex items-center gap-3 mb-4">
            <p className="text-xs font-semibold tracking-widest uppercase text-[var(--text-tertiary)]">Vibes</p>
            <a href="/?category=etc"
              className="flex items-center gap-1 text-xs text-[var(--text-tertiary)] hover:text-[var(--purple)] transition-colors group">
              {tp("community_link")}
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="group-hover:translate-x-0.5 transition-transform">
                <path d="M2 6h8M6 3l3 3-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* openresearch.ai */}
            <div className="rounded-2xl p-5 flex flex-col gap-2 bg-[var(--surface)] border border-[var(--border-light)]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md overflow-hidden shrink-0">
                  <Image src="/oprs_logo.jpeg" alt="openresearch.ai" width={24} height={24} className="w-full h-full object-cover rounded-md" unoptimized />
                </div>
                <p className="text-sm font-bold">openresearch.ai</p>
              </div>
              <p className="text-xs text-[var(--text-tertiary)]">{tp("oprs_tagline")}</p>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {tp("oprs_desc")}
              </p>
            </div>

            {/* Oh Taro */}
            <div className="rounded-2xl p-5 flex flex-col gap-2 bg-[var(--surface)] border border-[var(--border-light)]">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold">Oh Taro</p>
                <span className="text-[10px] font-medium text-[var(--text-tertiary)] bg-white border border-[var(--border-light)] px-2 py-0.5 rounded-full">{tp("ohtaro_status")}</span>
              </div>
              <p className="text-xs text-[var(--text-tertiary)]">{tp("ohtaro_tagline")}</p>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {tp("ohtaro_desc")}
              </p>
            </div>

            {/* YouTube */}
            <div className="rounded-2xl p-5 flex flex-col gap-2 bg-[var(--surface)] border border-[var(--border-light)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg width="20" height="14" viewBox="0 0 20 14" fill="none" className="shrink-0">
                    <rect width="20" height="14" rx="3" fill="#FF0000"/>
                    <path d="M8 4l5 3-5 3V4z" fill="white"/>
                  </svg>
                  <p className="text-sm font-bold">YouTube</p>
                </div>
                <span className="text-[10px] font-medium text-[var(--text-tertiary)] bg-white border border-[var(--border-light)] px-2 py-0.5 rounded-full">{tp("youtube_status")}</span>
              </div>
              <p className="text-xs text-[var(--text-tertiary)]">{tp("youtube_tagline")}</p>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {tp("youtube_desc")}
              </p>
            </div>

            {/* Essay */}
            <div className="rounded-2xl p-5 flex flex-col gap-2 bg-[var(--surface)] border border-[var(--border-light)]">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold">Essay</p>
                <span className="text-[10px] font-medium text-[var(--text-tertiary)] bg-white border border-[var(--border-light)] px-2 py-0.5 rounded-full">{tp("essay_status")}</span>
              </div>
              <p className="text-xs text-[var(--text-tertiary)]">{tp("essay_tagline")}</p>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {tp("essay_desc")}
              </p>
            </div>

          </div>
        </div>
      </main>

      <ChatBot />
    </div>
  );
}
