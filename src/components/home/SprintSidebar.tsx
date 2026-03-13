"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface SprintItem {
  id: string;
  title: string;
  status: "done" | "in_progress" | "planned";
  product: "oo.ai" | "o talk" | "platform";
}

const SPRINT_ITEMS: SprintItem[] = [
  { id: "s1", title: "Claude claude-sonnet-4-6 통합", status: "done", product: "oo.ai" },
  { id: "s2", title: "검색 결과 품질 개선", status: "done", product: "oo.ai" },
  { id: "s3", title: "커뮤니티 피드 (이 페이지!)", status: "in_progress", product: "platform" },
  { id: "s4", title: "티켓 → GitHub 연동", status: "in_progress", product: "platform" },
  { id: "s5", title: "다크 모드", status: "planned", product: "oo.ai" },
  { id: "s6", title: "o talk 베타 신청", status: "planned", product: "o talk" },
];

const PRODUCT_COLORS = {
  "oo.ai": "text-violet-600",
  "o talk": "text-blue-600",
  platform: "text-gray-500",
};

export default function SprintSidebar() {
  const t = useTranslations("sprint");
  const ts = useTranslations("sidebar");

  const STATUS_CONFIG = {
    done:        { label: t("done"),        color: "text-green-600", bg: "bg-green-50", dot: "bg-green-500" },
    in_progress: { label: t("in_progress"), color: "text-blue-600",  bg: "bg-blue-50",  dot: "bg-blue-500 animate-pulse" },
    planned:     { label: t("planned"),     color: "text-gray-500",  bg: "bg-gray-50",  dot: "bg-gray-300" },
  };

  const done = SPRINT_ITEMS.filter((i) => i.status === "done").length;
  const total = SPRINT_ITEMS.length;
  const progress = Math.round((done / total) * 100);

  return (
    <aside className="w-72 shrink-0 space-y-4">
      {/* Sprint Card */}
      <div className="bg-white border border-[var(--border-light)] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold">{t("title")}</h3>
            <p className="text-xs text-[var(--text-tertiary)]">{t("week")}</p>
          </div>
          <span className="text-xs font-mono font-medium text-[var(--purple)] bg-[var(--purple-light)] px-2 py-1 rounded-full">
            {progress}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-[var(--border-light)] rounded-full mb-4 overflow-hidden">
          <div
            className="h-full bg-[var(--purple)] rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Items */}
        <div className="space-y-2">
          {SPRINT_ITEMS.map((item) => {
            const config = STATUS_CONFIG[item.status];
            return (
              <div key={item.id} className="flex items-start gap-2.5">
                <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0", config.dot)} />
                <div className="flex-1 min-w-0">
                  <p className={cn("text-xs leading-snug", item.status === "done" ? "line-through text-[var(--text-tertiary)]" : "text-[var(--foreground)]")}>
                    {item.title}
                  </p>
                  <span className={cn("text-[10px] font-medium", PRODUCT_COLORS[item.product])}>
                    {item.product}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Products Card */}
      <div className="bg-white border border-[var(--border-light)] rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-3">{ts("products")}</h3>
        <div className="space-y-2.5">
          <a
            href="https://oo.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 rounded-lg bg-[var(--surface)] hover:bg-[var(--purple-light)] transition-all group"
          >
            <div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-xl overflow-hidden shrink-0">
                  <Image src="/ooai_logo.webp" alt="oo.ai" width={16} height={16} className="w-full h-full object-cover" />
                </div>
                <span className="text-sm font-medium">oo.ai</span>
              </div>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                {ts("ooai_desc")}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] text-green-600 font-medium">{ts("live")}</span>
            </div>
          </a>

          <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--surface)] opacity-70">
            <div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-xl overflow-hidden shrink-0">
                  <Image src="/otalk_logo.jpg" alt="o talk" width={16} height={16} className="w-full h-full object-cover" />
                </div>
                <span className="text-sm font-medium">o talk</span>
              </div>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                {ts("otalk_desc")}
              </p>
            </div>
            <span className="text-[10px] text-[var(--text-tertiary)] font-medium">
              {ts("coming_soon")}
            </span>
          </div>
        </div>
      </div>

      {/* YouTube Card */}
      <a
        href="https://www.youtube.com/@vibe.hacker"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 p-4 bg-white border border-[var(--border-light)] rounded-xl hover:border-red-200 hover:shadow-sm transition-all group"
      >
        <div className="w-9 h-9 rounded-full bg-red-500 flex items-center justify-center shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold group-hover:text-red-500 transition-colors">
            @vibe.hacker
          </p>
          <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
            {ts("youtube_channel")}
          </p>
        </div>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-[var(--text-tertiary)] shrink-0">
          <path d="M2.5 9.5L9.5 2.5M9.5 2.5H4M9.5 2.5V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </a>

      {/* About Card */}
      <div className="bg-[var(--purple-light)] border border-purple-100 rounded-xl p-4">
        <p className="text-xs text-[var(--purple)] font-medium mb-1">
          {ts("about_title")}
        </p>
        <p className="text-xs text-purple-700 leading-relaxed">
          {ts("about_desc")}
        </p>
      </div>
    </aside>
  );
}
