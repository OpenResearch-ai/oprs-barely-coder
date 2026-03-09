"use client";

import { cn } from "@/lib/utils";
import type { Sprint, SprintItem, ItemStatus } from "@/lib/supabase/types";

interface Props {
  activeSprint: Sprint | null;
  items: SprintItem[];
  pastSprints: Sprint[];
}

const STATUS_CONFIG: Record<ItemStatus, { label: string; dot: string; row: string }> = {
  done: {
    label: "완료",
    dot: "bg-green-500",
    row: "opacity-60",
  },
  in_progress: {
    label: "진행 중",
    dot: "bg-blue-500 animate-pulse",
    row: "",
  },
  planned: {
    label: "예정",
    dot: "bg-gray-300",
    row: "",
  },
};

const PRODUCT_BADGE: Record<string, string> = {
  "oo.ai": "bg-violet-50 text-violet-700",
  "o talk": "bg-blue-50 text-blue-700",
  platform: "bg-gray-50 text-gray-600",
};

function ProgressBar({ items }: { items: SprintItem[] }) {
  const done = items.filter((i) => i.status === "done").length;
  const inProgress = items.filter((i) => i.status === "in_progress").length;
  const total = items.length;
  if (total === 0) return null;

  const donePercent = Math.round((done / total) * 100);
  const inProgressPercent = Math.round((inProgress / total) * 100);

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-[var(--text-tertiary)]">
        <span>{done}/{total} 완료</span>
        <span>{donePercent}%</span>
      </div>
      <div className="h-2 bg-[var(--border-light)] rounded-full overflow-hidden flex">
        <div
          className="h-full bg-green-500 transition-all duration-500"
          style={{ width: `${donePercent}%` }}
        />
        <div
          className="h-full bg-blue-400 transition-all duration-500"
          style={{ width: `${inProgressPercent}%` }}
        />
      </div>
    </div>
  );
}

export default function SprintBoard({ activeSprint, items, pastSprints }: Props) {
  if (!activeSprint) {
    return (
      <div className="pt-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">스프린트 보드</h1>
          <p className="text-[var(--text-secondary)]">
            커뮤니티 의견이 매주 스프린트에 반영됩니다.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-full bg-[var(--purple-light)] flex items-center justify-center mb-4">
            <span className="text-[var(--purple)] text-xl">🤖</span>
          </div>
          <p className="font-medium mb-1">스프린트 준비 중</p>
          <p className="text-sm text-[var(--text-tertiary)] max-w-sm">
            업데이트 예정
            커뮤니티에 글을 남겨 다음 스프린트에 영향을 주세요!
          </p>
        </div>
      </div>
    );
  }

  const groupedItems = {
    in_progress: items.filter((i) => i.status === "in_progress"),
    planned: items.filter((i) => i.status === "planned"),
    done: items.filter((i) => i.status === "done"),
  };

  return (
    <div className="pt-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          {activeSprint.status === "draft" && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              Draft — AI 생성, 확정 대기 중
            </span>
          )}
          {activeSprint.status === "active" && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
              진행 중
            </span>
          )}
          <span className="text-xs text-[var(--text-tertiary)]">
            {activeSprint.week_label} · {activeSprint.start_date} ~ {activeSprint.end_date}
          </span>
        </div>
        <h1 className="text-3xl font-bold mb-3">이번 주 스프린트</h1>
        <ProgressBar items={items} />
      </div>

      {/* AI Summary */}
      {activeSprint.ai_summary && (
        <div className="p-4 bg-[var(--purple-light)] border border-purple-100 rounded-xl mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 rounded-full bg-[var(--purple)] flex items-center justify-center">
              <span className="text-white text-[9px] font-bold">AI</span>
            </div>
            <span className="text-xs font-semibold text-[var(--purple)]">AI 스프린트 요약</span>
            <span className="text-[10px] text-purple-400">
              · {activeSprint.total_posts_analyzed}개 포스트 분석 · {activeSprint.total_votes_counted}표 반영
            </span>
          </div>
          <p className="text-sm text-purple-800 leading-relaxed">{activeSprint.ai_summary}</p>
        </div>
      )}

      {/* Kanban columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(["in_progress", "planned", "done"] as ItemStatus[]).map((status) => {
          const config = STATUS_CONFIG[status];
          const colItems = groupedItems[status];
          return (
            <div key={status} className="space-y-3">
              {/* Column header */}
              <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-light)]">
                <div className={cn("w-2 h-2 rounded-full", config.dot)} />
                <span className="text-xs font-semibold text-[var(--text-secondary)]">
                  {config.label}
                </span>
                <span className="text-xs text-[var(--text-tertiary)] ml-auto">
                  {colItems.length}
                </span>
              </div>

              {/* Items */}
              {colItems.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "p-3.5 bg-white border border-[var(--border-light)] rounded-xl hover:border-[var(--border)] hover:shadow-sm transition-all",
                    config.row
                  )}
                >
                  {item.product && (
                    <span
                      className={cn(
                        "text-[10px] font-medium px-1.5 py-0.5 rounded-full mb-2 inline-block",
                        PRODUCT_BADGE[item.product] ?? "bg-gray-50 text-gray-600"
                      )}
                    >
                      {item.product}
                    </span>
                  )}
                  <p
                    className={cn(
                      "text-sm font-medium leading-snug",
                      status === "done" && "line-through"
                    )}
                  >
                    {item.title}
                  </p>
                  {item.description && (
                    <p className="text-xs text-[var(--text-tertiary)] mt-1.5 leading-relaxed">
                      {item.description}
                    </p>
                  )}
                  {item.community_score > 0 && (
                    <div className="flex items-center gap-1 mt-2">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M5 1L9 6H1L5 1Z" fill="var(--purple)" />
                      </svg>
                      <span className="text-[10px] text-[var(--purple)]">
                        커뮤니티 스코어 {item.community_score}
                      </span>
                      {item.source_post_ids?.length > 0 && (
                        <span className="text-[10px] text-[var(--text-tertiary)]">
                          · {item.source_post_ids.length}개 포스트
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {colItems.length === 0 && (
                <p className="text-xs text-[var(--text-tertiary)] text-center py-6">
                  없음
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Past sprints */}
      {pastSprints.length > 0 && (
        <div className="mt-12">
          <h2 className="text-base font-semibold mb-4">지난 스프린트</h2>
          <div className="space-y-2">
            {pastSprints.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-3 bg-[var(--surface)] rounded-xl text-sm"
              >
                <span className="font-medium">{s.week_label}</span>
                <span className="text-[var(--text-tertiary)] text-xs">
                  {s.start_date} ~ {s.end_date}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
