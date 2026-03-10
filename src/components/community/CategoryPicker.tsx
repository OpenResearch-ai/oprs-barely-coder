"use client";

import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/post-categories";

interface Props {
  value: string;            // post_type (빈 문자열이면 미선택)
  onChange: (key: string) => void;
  product?: string;
  onProductChange?: (product: string) => void;
}

// 미선택 상태 스타일 (회색)
const UNSELECTED = "bg-[var(--surface)] text-[var(--text-tertiary)] border-[var(--border-light)] hover:border-[var(--border)] hover:text-[var(--text-secondary)]";
// 선택 상태 스타일 (보라)
const SELECTED   = "border-[var(--purple)] bg-[var(--purple)] text-white";

export default function CategoryPicker({ value, onChange, product, onProductChange }: Props) {
  const communityGroups = CATEGORIES.filter(c => c.group === "community");
  const orGroups        = CATEGORIES.filter(c => c.group === "openresearch");

  return (
    <div className="space-y-2">
      {/* 커뮤니티 */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider shrink-0 w-24">
          커뮤니티
        </span>
        {communityGroups.map(cat => {
          const isSelected = value === cat.key && !product;
          return (
            <button key={cat.key} type="button"
              onClick={() => { onChange(cat.key); onProductChange?.(""); }}
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border transition-all",
                isSelected ? SELECTED : UNSELECTED
              )}>
              {cat.emoji && <span>{cat.emoji}</span>}
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* 기타 */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider shrink-0 w-24">
          기타
        </span>

        {orGroups.map(cat => {
          const isSelected = value === cat.key && !product;
          return (
            <button key={cat.key} type="button"
              onClick={() => { onChange(cat.key); onProductChange?.(""); }}
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border transition-all",
                isSelected ? SELECTED : UNSELECTED
              )}>
              {cat.emoji && <span>{cat.emoji}</span>}
              {cat.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
