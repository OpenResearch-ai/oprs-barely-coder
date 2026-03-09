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

      <main className="max-w-5xl mx-auto px-4 pb-40 page-top">
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

        {/* Cards — openresearch.ai first, full width */}
        <div className="space-y-5">
          <SiteCard sprint={activeSprint} items={items} locale={locale} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <OoAiCard sprint={activeSprint} items={items} locale={locale} />
            <OTalkCard sprint={activeSprint} items={items} locale={locale} />
          </div>
        </div>

        {/* Bottom note: community = sprint */}
        <a href={`/${locale}/community`}
          className="mt-8 flex items-center gap-4 p-5 rounded-2xl transition-all hover:shadow-md group"
          style={{ background: "linear-gradient(135deg, #f0f0ff, #f8f0ff)", border: "1px solid rgba(71,74,255,0.12)" }}>
          <div className="shrink-0 text-2xl">💬</div>
          <div className="flex-1">
            <p className="text-sm font-bold text-[var(--purple)] mb-0.5">{t("community_equals_sprint")}</p>
            <p className="text-xs text-purple-700 leading-relaxed">
              {t("community_sprint_desc")}
            </p>
          </div>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-[var(--purple)] group-hover:translate-x-1 transition-transform">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </a>
      </main>

      <ChatBot />
    </div>
  );
}
