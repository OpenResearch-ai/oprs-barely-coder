export interface Category {
  key: string;
  label: string;
  labelEn: string;
  color: string;
  group: "community" | "openresearch";
  emoji?: string;
}

// These are the ONLY categories shown in both the community feed AND the write page.
// "feature" and "bug" are post_type values kept in DB for legacy/API use,
// but NOT shown as standalone categories — product selection handles that context.
export const CATEGORIES: Category[] = [
  // ── 커뮤니티 ──
  { key: "vibe_coding", label: "바이브 코딩", labelEn: "Vibe Coding", color: "bg-purple-50 text-purple-700", group: "community", emoji: "✨" },
  { key: "ai",          label: "AI / LLM",   labelEn: "AI / LLM",    color: "bg-blue-50 text-blue-700",    group: "community", emoji: "🤖" },
  { key: "news",        label: "IT 뉴스",    labelEn: "IT News",      color: "bg-orange-50 text-orange-700", group: "community", emoji: "📰" },
  { key: "showcase",    label: "쇼케이스",   labelEn: "Showcase",     color: "bg-green-50 text-green-700",  group: "community", emoji: "🚀" },
  { key: "resource",    label: "리소스",     labelEn: "Resources",    color: "bg-sky-50 text-sky-700",      group: "community", emoji: "📎" },
  { key: "question",    label: "질문",       labelEn: "Q&A",          color: "bg-amber-50 text-amber-700",  group: "community", emoji: "❓" },
  { key: "free",        label: "자유게시판", labelEn: "Free Board",   color: "bg-gray-100 text-gray-600",   group: "community", emoji: "💬" },
  // ── 기타 ──
  { key: "etc", label: "기타", labelEn: "Other", color: "bg-gray-100 text-gray-600", group: "openresearch" },
];

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(c => [c.key, c]));
export const communityCategories = CATEGORIES.filter(c => c.group === "community");
export const orCategories        = CATEGORIES.filter(c => c.group === "openresearch");

// All valid post_type values (includes feature/bug for DB compatibility)
export type PostType =
  | "vibe_coding" | "ai" | "showcase" | "resource" | "question"
  | "proposal" | "etc" | "feature" | "bug" | "community";

// Badge for rendering any post_type (including legacy ones)
export const TYPE_BADGE: Record<string, { label: string; labelEn: string; color: string; emoji?: string }> = {
  vibe_coding: { label: "바이브 코딩",  labelEn: "Vibe Coding",    color: "bg-purple-50 text-purple-700", emoji: "✨" },
  ai:          { label: "AI / LLM",    labelEn: "AI / LLM",       color: "bg-blue-50 text-blue-700",     emoji: "🤖" },
  news:        { label: "IT 뉴스",     labelEn: "IT News",         color: "bg-orange-50 text-orange-700", emoji: "📰" },
  showcase:    { label: "쇼케이스",    labelEn: "Showcase",        color: "bg-green-50 text-green-700",   emoji: "🚀" },
  resource:    { label: "리소스",      labelEn: "Resources",       color: "bg-sky-50 text-sky-700",       emoji: "📎" },
  question:    { label: "질문",        labelEn: "Q&A",             color: "bg-amber-50 text-amber-700",   emoji: "❓" },
  free:        { label: "자유게시판",  labelEn: "Free Board",      color: "bg-gray-100 text-gray-600",    emoji: "💬" },
  proposal:    { label: "서비스 제안", labelEn: "Proposal",        color: "bg-violet-50 text-violet-700", emoji: "💡" },
  etc:         { label: "기타",        labelEn: "Other",           color: "bg-gray-100 text-gray-600" },
  feature:     { label: "기능 요청",   labelEn: "Feature Request", color: "bg-indigo-50 text-indigo-700", emoji: "⚡" },
  bug:         { label: "버그 신고",   labelEn: "Bug Report",      color: "bg-red-50 text-red-600",       emoji: "🐛" },
  community:   { label: "",            labelEn: "",                color: "" },
};
