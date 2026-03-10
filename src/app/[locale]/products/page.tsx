import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import Header from "@/components/layout/Header";
import ChatBot from "@/components/chatbot/ChatBot";
import OoAiCard from "@/components/products/OoAiCard";
import OTalkCard from "@/components/products/OTalkCard";
import SiteCard from "@/components/products/SiteCard";
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

        {/* openresearch.ai 플랫폼 */}
        <div className="mb-12">
          <SiteCard sprint={activeSprint} items={items} locale={locale} />
        </div>

        {/* Vibes */}
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-[var(--text-tertiary)] mb-4">
            Vibes
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Oh Taro */}
            <div className="rounded-2xl p-5 flex flex-col gap-3"
              style={{ background: "linear-gradient(135deg, #fdf4ff, #fef9ff)", border: "1px solid rgba(168,85,247,0.15)" }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-bold">Oh Taro</p>
                  <p className="text-xs text-[var(--text-tertiary)]">심리상담 & 타로</p>
                </div>
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">심사 중</span>
              </div>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                AI와 함께하는 심리상담과 타로. 당신의 마음을 들어줍니다.
              </p>
            </div>

            {/* YouTube */}
            <div className="rounded-2xl p-5 flex flex-col gap-3"
              style={{ background: "linear-gradient(135deg, #fff8f8, #fff5f5)", border: "1px solid rgba(239,68,68,0.12)" }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-bold">YouTube</p>
                  <p className="text-xs text-[var(--text-tertiary)]">바이브코딩 · AI · 동기부여</p>
                </div>
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">스텔스 중</span>
              </div>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                AI가 콘텐츠를 생산하고 소통하는 채널. 현재 스텔스모드로 운영 중이며 곧 공개 예정.
              </p>
            </div>

            {/* Essay */}
            <div className="rounded-2xl p-5 flex flex-col gap-3"
              style={{ background: "linear-gradient(135deg, #f8f9ff, #f5f7ff)", border: "1px solid rgba(71,74,255,0.1)" }}>
              <div>
                <p className="text-base font-bold">Essay</p>
                <p className="text-xs text-[var(--text-tertiary)]">AI와 함께 쓰는 에세이 · 소설</p>
              </div>
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
