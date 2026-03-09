"use client";

import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/post-categories";
import Image from "next/image";

interface Props {
  value: string;            // post_type
  onChange: (key: string) => void;
  product?: string;         // "oo.ai" | "o talk" | "platform" | ""
  onProductChange?: (product: string) => void;
}

const PRODUCTS = [
  { key: "oo.ai",    label: "oo.ai",           logo: "/ooai_logo.webp" },
  { key: "o talk",   label: "o talk",           logo: "/otalk_logo.jpg" },
  { key: "platform", label: "openresearch.ai",  logo: "/oprs_logo.jpeg" },
  // 서비스 제안은 orGroups에서 별도 렌더링
];

export default function CategoryPicker({ value, onChange, product, onProductChange }: Props) {
  const communityGroups = CATEGORIES.filter(c => c.group === "community");
  const orGroups = CATEGORIES.filter(c => c.group === "openresearch");

  return (
    <div className="space-y-2">
      {/* 커뮤니티 */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider shrink-0 w-24">
          커뮤니티
        </span>
        {communityGroups.map(cat => (
          <button key={cat.key} type="button" onClick={() => {
            onChange(cat.key);
            onProductChange?.(""); // 제품 선택 해제
          }}
            className={cn(
              "inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border transition-all",
              value === cat.key
                ? "border-[var(--purple)] bg-[var(--purple)] text-white"
                : `${cat.color} border-transparent hover:border-[var(--border)]`
            )}>
            {cat.emoji && <span>{cat.emoji}</span>}
            {cat.label}
          </button>
        ))}
      </div>

      {/* OpenResearch — 순서: oo.ai, o talk, openresearch, 서비스제안 */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider shrink-0 w-24">
          OpenResearch
        </span>

        {/* 작품별 먼저 — product 선택 시 카테고리는 community(중립)로 */}
        {onProductChange && PRODUCTS.map(p => (
          <button key={p.key} type="button"
            onClick={() => {
              if (product === p.key) {
                onProductChange("");
              } else {
                onProductChange(p.key);
                onChange("community"); // 카테고리 중립으로 리셋
              }
            }}
            className={cn(
              "inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border transition-all",
              product === p.key
                ? "border-[var(--purple)] bg-[var(--purple)] text-white"
                : "bg-white text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--purple-muted)]"
            )}>
            <span className="w-3 h-3 rounded-sm overflow-hidden shrink-0 inline-flex">
              <Image src={p.logo} alt={p.label} width={12} height={12}
                className="object-cover" unoptimized />
            </span>
            {p.label}
          </button>
        ))}

        {/* 서비스 제안 — 제품 뒤에 배치 */}
        {orGroups.map(cat => (
          <button key={cat.key} type="button" onClick={() => {
            onChange(cat.key);
            onProductChange?.("");
          }}
            className={cn(
              "inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border transition-all",
              value === cat.key && !product
                ? "border-[var(--purple)] bg-[var(--purple)] text-white"
                : `${cat.color} border-transparent hover:border-[var(--border)]`
            )}>
            {cat.emoji && <span>{cat.emoji}</span>}
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  );
}
