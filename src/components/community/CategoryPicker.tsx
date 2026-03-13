"use client";

import Image from "next/image";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/post-categories";

interface Props {
  value: string;
  onChange: (key: string) => void;
  product?: string;
  onProductChange?: (product: string) => void;
}

const WRITE_PRODUCTS = [
  { key: "oo.ai",  label: "oo.ai",  logo: "/ooai_logo.webp" },
  { key: "o talk", label: "o talk", logo: "/otalk_logo.jpg" },
];

// 미선택 상태 스타일 (회색)
const UNSELECTED = "bg-[var(--surface)] text-[var(--text-tertiary)] border-[var(--border-light)] hover:border-[var(--border)] hover:text-[var(--text-secondary)]";
// 선택 상태 스타일 (보라)
const SELECTED   = "border-[var(--purple)] bg-[var(--purple)] text-white";

export default function CategoryPicker({ value, onChange, product, onProductChange }: Props) {
  const locale = useLocale();
  const getLabel = (cat: { label: string; labelEn: string }) =>
    locale !== "ko" ? cat.labelEn : cat.label;
  const communityGroups = CATEGORIES.filter(c => c.group === "community");
  const orGroups        = CATEGORIES.filter(c => c.group === "openresearch");

  return (
    <div className="space-y-2">
      {/* 커뮤니티 */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider shrink-0 w-24">
          {locale !== "ko" ? "Community" : "커뮤니티"}
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
              {getLabel(cat)}
            </button>
          );
        })}
      </div>

      {/* 기타 */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider shrink-0 w-24">
          {locale !== "ko" ? "Other" : "기타"}
        </span>

        {/* 제품 태그 — 글쓰기 모달에서만 표시 */}
        {onProductChange && WRITE_PRODUCTS.map(p => {
          const isSelected = product === p.key;
          return (
            <button key={p.key} type="button"
              onClick={() => { isSelected ? onProductChange("") : (onProductChange(p.key), onChange("community")); }}
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border transition-all",
                isSelected ? SELECTED : UNSELECTED
              )}>
              <span className="w-3 h-3 rounded-sm overflow-hidden shrink-0 inline-flex">
                <Image src={p.logo} alt={p.label} width={12} height={12} className="object-cover" unoptimized />
              </span>
              {p.label}
            </button>
          );
        })}

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
              {getLabel(cat)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
