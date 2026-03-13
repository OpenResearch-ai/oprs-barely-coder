"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { SprintItem } from "@/lib/supabase/types";

type ItemStatus = "planned" | "in_progress" | "done";

interface Props {
  items: SprintItem[];
  product: "oo.ai" | "o talk" | "platform";
  weekLabel?: string;
  hasSprint?: boolean;
  dark?: boolean;
  communityHref?: string;
}

export default function SprintItems({ items, product, weekLabel, hasSprint = true, dark = false, communityHref }: Props) {
  const t = useTranslations("sprintItems");

  const STATUS: Record<ItemStatus, { dot: string; label: string; lightColor: string; darkColor: string }> = {
    done:        { dot: "bg-green-400",              label: t("done"),        lightColor: "text-green-500", darkColor: "text-green-400" },
    in_progress: { dot: "bg-blue-400 animate-pulse", label: t("in_progress"), lightColor: "text-blue-500",  darkColor: "text-blue-400" },
    planned:     { dot: "bg-gray-300",               label: t("planned"),     lightColor: "text-gray-400",  darkColor: "text-gray-500" },
  };

  const filtered = items.filter((i) => i.product === product);

  const labelColor = dark ? "rgba(255,255,255,0.35)" : "var(--text-tertiary)";
  const textColor = dark ? "rgba(255,255,255,0.75)" : "var(--foreground)";
  const mutedColor = dark ? "rgba(255,255,255,0.35)" : "var(--text-tertiary)";
  const emptyBg = dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";
  const progressBg = dark ? "rgba(255,255,255,0.08)" : "rgba(71,74,255,0.08)";

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: labelColor }}>
          {t("sprint_title")}
        </span>
        {communityHref && (
          <a href={communityHref}
            className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full transition-all hover:opacity-80"
            style={{
              background: dark ? "rgba(71,74,255,0.3)" : "rgba(71,74,255,0.1)",
              color: dark ? "#a0a3ff" : "var(--purple)",
            }}>
            {t("community")}
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M1.5 6.5L6.5 1.5M6.5 1.5H3M6.5 1.5V5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
        )}
        <span className="ml-auto text-[10px] font-mono" style={{ color: labelColor }}>
          {weekLabel}
        </span>
      </div>

      {!hasSprint ? (
        <div className="flex items-center gap-2 px-3 py-3 rounded-xl" style={{ background: emptyBg }}>
          <div className="w-4 h-4 rounded-full border-2 border-dashed shrink-0"
            style={{ borderColor: dark ? "rgba(255,255,255,0.15)" : "var(--border)" }} />
          <p className="text-xs" style={{ color: mutedColor }}>{t("no_sprint")}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex items-center gap-2 px-3 py-3 rounded-xl" style={{ background: emptyBg }}>
          <div className="w-4 h-4 rounded-full border-2 border-dashed shrink-0"
            style={{ borderColor: dark ? "rgba(255,255,255,0.15)" : "var(--border)" }} />
          <p className="text-xs" style={{ color: mutedColor }}>{t("no_items")}</p>
        </div>
      ) : (
        <div className="space-y-1">
          {(() => {
            const done = filtered.filter(i => i.status === "done").length;
            const pct = Math.round((done / filtered.length) * 100);
            return (
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: progressBg }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: "linear-gradient(90deg, #474aff, #a54bff)" }} />
                </div>
                <span className="text-[10px] font-mono shrink-0" style={{ color: mutedColor }}>
                  {done}/{filtered.length}
                </span>
              </div>
            );
          })()}

          {filtered.map((item) => {
            const s = STATUS[item.status as ItemStatus] ?? STATUS.planned;
            return (
              <div key={item.id} className="flex items-start gap-2.5 py-1">
                <div className={cn("w-1.5 h-1.5 rounded-full mt-[5px] shrink-0", s.dot)} />
                <div className="flex-1 flex items-start justify-between gap-2">
                  <span className={cn("text-xs leading-snug", item.status === "done" && "line-through")}
                    style={{ color: item.status === "done" ? mutedColor : textColor }}>
                    {item.title}
                  </span>
                  <span className={cn("text-[10px] shrink-0 mt-0.5 font-medium", dark ? s.darkColor : s.lightColor)}>
                    {s.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
