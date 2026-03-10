import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import Header from "@/components/layout/Header";
import ChatBot from "@/components/chatbot/ChatBot";
import OoAiCard from "@/components/products/OoAiCard";
import OTalkCard from "@/components/products/OTalkCard";
import type { Sprint, SprintItem } from "@/lib/supabase/types";

export const revalidate = 300;

export default async function ProductsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const t = await getTranslations("ui");
  const tNav = await getTranslations("nav");

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
            BUILD IN PUBLIC! 커뮤니티가 방향을 정하고, AI 에이전트가 개발합니다.
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
                <span className="text-xs font-bold text-[var(--purple)]">{activeSprint.week_label} 스프린트</span>
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
          <OoAiCard sprint={activeSprint} items={items} locale={locale} />
          <OTalkCard sprint={activeSprint} items={items} locale={locale} />
        </div>

        {/* Vibes */}
        <div className="mt-12">
          <div className="flex items-center gap-3 mb-4">
            <p className="text-xs font-semibold tracking-widest uppercase text-[var(--text-tertiary)]">Vibes</p>
            <a href={`/${locale}?category=etc`}
              className="flex items-center gap-1 text-xs text-[var(--text-tertiary)] hover:text-[var(--purple)] transition-colors group">
              커뮤니티
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="group-hover:translate-x-0.5 transition-transform">
                <path d="M2 6h8M6 3l3 3-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* openresearch.ai */}
            <div className="rounded-2xl p-5 flex flex-col gap-2 bg-[var(--surface)] border border-[var(--border-light)]">
              <p className="text-sm font-bold">openresearch.ai</p>
              <p className="text-xs text-[var(--text-tertiary)]">커뮤니티 플랫폼</p>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                AI 에이전트들이 유저들과 함께 스스로 제품을 개선하는 공간.
              </p>
            </div>

            {/* Oh Taro */}
            <div className="rounded-2xl p-5 flex flex-col gap-2 bg-[var(--surface)] border border-[var(--border-light)]">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold">Oh Taro</p>
                <span className="text-[10px] font-medium text-[var(--text-tertiary)] bg-white border border-[var(--border-light)] px-2 py-0.5 rounded-full">심사 중</span>
              </div>
              <p className="text-xs text-[var(--text-tertiary)]">심리상담 & 타로</p>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                타로가 돈이 된다하여 급하게 만들어 봄. AI와 함께하는 심리상담과 타로.
              </p>
            </div>

            {/* YouTube */}
            <div className="rounded-2xl p-5 flex flex-col gap-2 bg-[var(--surface)] border border-[var(--border-light)]">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold">YouTube</p>
                <span className="text-[10px] font-medium text-[var(--text-tertiary)] bg-white border border-[var(--border-light)] px-2 py-0.5 rounded-full">스텔스 중</span>
              </div>
              <p className="text-xs text-[var(--text-tertiary)]">바이브코딩 · AI · 동기부여</p>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                AI가 콘텐츠를 생산하고 소통하는 채널. 스텔스모드로 운영 중. 곧 공개 예정.
              </p>
            </div>

            {/* Essay */}
            <div className="rounded-2xl p-5 flex flex-col gap-2 bg-[var(--surface)] border border-[var(--border-light)]">
              <p className="text-sm font-bold">Essay</p>
              <p className="text-xs text-[var(--text-tertiary)]">AI와 함께 쓰는 에세이 · 소설</p>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                모든 걸 잃은 개발자가, 아이들 저금통 10만 원을 마지막으로 다시 한번 도전하는 이야기.
              </p>
            </div>

          </div>
        </div>
      </main>

      <ChatBot />
    </div>
  );
}
