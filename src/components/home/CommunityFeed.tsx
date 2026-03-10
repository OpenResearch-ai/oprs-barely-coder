"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { cn, getYouTubeThumbnail } from "@/lib/utils";
import PostCreateModal from "@/components/community/PostCreateModal";
import { useHighlight } from "@/lib/highlight-context";
import { usePageActionListener, type PageAction } from "@/lib/page-actions";
import { TYPE_BADGE, communityCategories, orCategories } from "@/lib/post-categories";

interface FilterItem {
  key: string;
  label: string;
  group: "all" | "community" | "or";
  kind: "all" | "type" | "product";
  value: string;
  logo?: string;
  href?: string;
}

// TYPE_BADGE imported from post-categories.ts (single source of truth)

const PRODUCT_BADGE: Record<string, string> = {
  "oo.ai":    "bg-violet-50 text-violet-700",
  "o talk":   "bg-blue-50 text-blue-700",
  "platform": "bg-gray-50 text-gray-600",
};

interface Post {
  id: string;
  title: string;
  content: string | null;
  author_name: string;
  post_type: string;
  product: string | null;
  upvote_count: number;
  comment_count: number;
  tags: string[];
  created_at: string;
  source_url?: string | null;
  image_url?: string | null;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}일 전`;
  if (h > 0) return `${h}시간 전`;
  if (m > 0) return `${m}분 전`;
  return "방금 전";
}

interface Props {
  initialProduct?: string | null;
  onPostsLoaded?: (posts: { id: string; title: string; type: string; product?: string }[]) => void;
}

// ALL filter label is set dynamically inside component via t()
const ALL_BASE = { key: "all", group: "all" as const, kind: "all" as const, value: "all" };
const ALL: FilterItem = { ...ALL_BASE, label: "전체" }; // default, overridden in component

// Static filter definitions — all use kind:"type" now (unified with post types)
const STATIC_FILTERS: Omit<FilterItem, "href">[] = [
  ALL,
  // Community categories → all map to post_type
  ...communityCategories.map(c => ({
    key: c.key, label: c.label, group: "community" as const, kind: "type" as const, value: c.key,
  })),
  { key: "ooai",  label: "oo.ai",  group: "or" as const, kind: "product" as const, value: "oo.ai",  logo: "/ooai_logo.webp" },
  { key: "talk",  label: "o talk", group: "or" as const, kind: "product" as const, value: "o talk", logo: "/otalk_logo.jpg" },
  ...orCategories.map(c => ({
    key: c.key, label: c.label, group: "or" as const, kind: "type" as const, value: c.key,
  })),
];

export default function CommunityFeed({ initialProduct, onPostsLoaded }: Props) {
  const locale = useLocale();
  const t = useTranslations("ui");
  const router = useRouter();
  const ALL_I18N: FilterItem = { ...ALL_BASE, label: t("filter_all") };

  // Set active filter from initialProduct on mount
  const getInitialFilter = (): FilterItem => {
    if (!initialProduct) return ALL_I18N;
    return STATIC_FILTERS.find(
      f => f.kind === "product" && f.value === initialProduct
    ) as FilterItem ?? ALL_I18N;
  };

  const [active, setActive] = useState<FilterItem>(getInitialFilter);
  const [searchQuery, setSearchQuery] = useState("");
  const [authorFilter, setAuthorFilter] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false); // kept for AI tool calling
  const [modalDraft, setModalDraft] = useState<{ title?: string; content?: string; category?: string } | undefined>();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [upvoted, setUpvoted] = useState<Set<string>>(new Set());
  const { isPostHighlighted, isSectionHighlighted } = useHighlight();
  // stable ref for onPostsLoaded — prevents infinite re-render
  const onPostsLoadedRef = useRef(onPostsLoaded);
  useEffect(() => { onPostsLoadedRef.current = onPostsLoaded; }, [onPostsLoaded]);

  // Inject locale-aware hrefs
  const FILTERS: FilterItem[] = STATIC_FILTERS.map(f => ({
    ...f,
    href: f.kind === "product" && f.key !== "prop"
      ? `/${locale}/community?product=${f.value === "o talk" ? "o+talk" : f.value}`
      : undefined,
  }));

  // Use ref to avoid fetchPosts changing when onPostsLoaded changes
  // Listen for page actions from AI chatbot
  usePageActionListener(useCallback((action: PageAction) => {
    if (action.type === "filter_community") {
      const match = STATIC_FILTERS.find(f => f.value === action.filter || f.key === action.filter);
      if (match) setActive(match as FilterItem);
      else setActive(ALL);
    } else if (action.type === "search_community") {
      setSearchQuery(action.query);
    } else if (action.type === "clear_filters") {
      setActive(ALL);
      setSearchQuery("");
    } else if (action.type === "open_write_modal") {
      setModalDraft(action.draft);
      setShowModal(true);
    }
  }, []));

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      // tag-based filters → show all posts with community type (tags not stored yet)
      // type-based filters → use type param
      // active 상태로만 필터링 — initialProduct는 초기화에만 사용
      if (active.kind === "type")         params.set("type",    active.value);
      else if (active.kind === "product") params.set("product", active.value);
      if (authorFilter) params.set("author", authorFilter);
      params.set("sort", "new");
      params.set("limit", "20");

      const res = await fetch(`/api/posts?${params}`);
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      const loaded: Post[] = data.posts ?? [];
      setPosts(loaded);
      onPostsLoadedRef.current?.(loaded.map(p => ({
        id: p.id, title: p.title, type: p.post_type, product: p.product ?? undefined,
      })));

      // 로그인 유저의 투표 내역 조회
      if (loaded.length > 0) {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: votes } = await supabase
            .from("votes")
            .select("post_id")
            .eq("user_id", user.id)
            .in("post_id", loaded.map(p => p.id));
          if (votes?.length) {
            setUpvoted(new Set(votes.map(v => v.post_id as string)));
          }
        }
      }
    } catch (err) {
      console.error("fetchPosts error:", err);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [active, authorFilter]); // initialProduct는 초기화에만 사용

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const toggleUpvote = async (postId: string) => {
    const isVoted = upvoted.has(postId);
    setUpvoted(prev => { const s = new Set(prev); isVoted ? s.delete(postId) : s.add(postId); return s; });
    setPosts(p => p.map(post =>
      post.id === postId ? { ...post, upvote_count: post.upvote_count + (isVoted ? -1 : 1) } : post
    ));
    try {
      await fetch(`/api/posts/${postId}/vote`, { method: isVoted ? "DELETE" : "POST" });
    } catch { /* ignore */ }
  };

  const Chip = ({ f }: { f: FilterItem }) => {
    const isActive = active.key === f.key;
    const activeClass = f.group === "or"
      ? "bg-[var(--purple)] text-white border-[var(--purple)]"
      : "bg-[var(--foreground)] text-white border-[var(--foreground)]";
    const base = "inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border transition-all whitespace-nowrap shrink-0 font-medium";
    const inactive = "bg-white text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--purple-muted)] hover:text-[var(--foreground)]";

    const inner = (
      <>
        {f.logo && (
          <span className="w-3.5 h-3.5 rounded-sm overflow-hidden shrink-0 inline-flex items-center justify-center">
            <Image src={f.logo} alt={f.label} width={14} height={14}
              className={cn("object-cover", f.key === "plat" ? "rounded-full" : "rounded-sm")}
              unoptimized />
          </span>
        )}
        {f.label}
      </>
    );

    if (f.href) return (
      <a href={f.href} className={cn(base, isActive ? activeClass : inactive)}>{inner}</a>
    );
    return (
      <button onClick={() => setActive(isActive ? ALL : f)} className={cn(base, isActive ? activeClass : inactive)}>
        {inner}
      </button>
    );
  };

  const communityFilters = FILTERS.filter(f => f.group === "community");
  const orFilters = FILTERS.filter(f => f.group === "or");

  return (
    <>
      {/* ── Filter bar + 글쓰기 ── */}
      <div className="pt-3 pb-1">
        <div className="flex items-center gap-2">
          {/* Desktop: 한 줄 / Mobile: 두 줄 */}
          <div className="flex-1 min-w-0">
            {/* Desktop — 전체+커뮤니티+기타 한 줄 */}
            <div className="hidden md:flex items-center gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              <Chip f={ALL} />
              <div className="w-px h-4 bg-[var(--border)] shrink-0 mx-0.5" />
              {communityFilters.map(f => <Chip key={f.key} f={f} />)}
              <div className="w-px h-4 bg-[var(--border)] shrink-0 mx-0.5" />
              {orFilters.map(f => <Chip key={f.key} f={f} />)}
            </div>

            {/* Mobile — Row 1 */}
            <div className="md:hidden overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              <div className="flex items-center gap-1.5 w-max">
                <Chip f={ALL} />
                <div className="w-px h-4 bg-[var(--border)] shrink-0 mx-0.5" />
                {communityFilters.map(f => <Chip key={f.key} f={f} />)}
              </div>
            </div>
            {/* Mobile — Row 2 */}
            <div className="md:hidden overflow-x-auto mt-1.5" style={{ scrollbarWidth: "none" }}>
              <div className="flex items-center gap-1.5 w-max">
                {orFilters.map(f => <Chip key={f.key} f={f} />)}
              </div>
            </div>
          </div>

          {/* 글쓰기 */}
          <button
            onClick={() => router.push(`/${locale}/write${active.kind === 'product' ? '?product=' + encodeURIComponent(active.value) : active.kind === 'type' ? '?category=' + active.value : ''}`)}
            className="px-3.5 py-1.5 text-white text-xs font-semibold rounded-full shrink-0 hover:opacity-90 transition-all"
            style={{ background: "linear-gradient(135deg, #474aff, #a54bff)" }}>
            {t("write")}
          </button>
        </div>

        {/* Author filter badge */}
        {authorFilter && (
          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-xs text-[var(--text-tertiary)]">작성자:</span>
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ background: "var(--purple-light)", color: "var(--purple)" }}>
              {authorFilter}
              <button onClick={() => setAuthorFilter(null)} className="ml-0.5 opacity-60 hover:opacity-100 font-bold">×</button>
            </span>
          </div>
        )}

        {/* Search bar */}
        <div className="mt-3 relative">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t("search_placeholder")}
            className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-[var(--border-light)] outline-none focus:border-[var(--purple-muted)] bg-[var(--surface)] placeholder:text-[var(--text-tertiary)] transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--foreground)]">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="h-px bg-[var(--border-light)] mt-4 mb-5" />

      {/* ── Loading ── */}
      {loading && (
        <div className="space-y-2.5">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-[72px] rounded-2xl animate-pulse" style={{ background: "var(--surface)" }} />
          ))}
        </div>
      )}

      {/* ── Posts ── */}
      {!loading && (() => {
        const displayed = searchQuery.trim()
          ? posts.filter(p =>
              p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (p.content ?? "").toLowerCase().includes(searchQuery.toLowerCase())
            )
          : posts;

        if (displayed.length === 0) return (
          <div className="text-center py-12 text-sm text-[var(--text-tertiary)]">
            {searchQuery ? `"${searchQuery}" 검색 결과가 없어요.` : t("no_posts")}
          </div>
        );

        return (
        <div id="section-community"
          className={cn(
            "space-y-2 transition-all duration-500",
            isSectionHighlighted("community") && "ring-2 ring-[var(--purple)] ring-offset-4 rounded-2xl"
          )}>
          {displayed.map((post, idx) => {
            const badge = TYPE_BADGE[post.post_type];
            const isVoted = upvoted.has(post.id);
            const hl = isPostHighlighted(post.id);
            return (
              <article key={post.id} id={`post-${post.id}`}
                onClick={() => window.location.href = `/${locale}/posts/${post.id}`}
                className={cn(
                  "group flex gap-3 p-4 bg-white border rounded-2xl transition-all cursor-pointer animate-fade-in",
                  hl
                    ? "border-[var(--purple)] scale-[1.005]"
                    : "border-[var(--border-light)] hover:border-[var(--border)] hover:shadow-sm"
                )}
                style={{
                  animationDelay: `${idx * 30}ms`,
                  ...(hl && { background: "linear-gradient(135deg,#fff,#f5f5ff)", boxShadow: "0 0 0 2px rgba(71,74,255,.15),0 4px 16px rgba(71,74,255,.08)" }),
                }}>

                {/* Upvote */}
                <button onClick={e => { e.stopPropagation(); toggleUpvote(post.id); }}
                  className="flex flex-col items-center gap-0.5 shrink-0 pt-0.5 w-7">
                  <svg width="12" height="12" viewBox="0 0 13 13" fill="none"
                    style={{ color: isVoted ? "var(--purple)" : "var(--text-tertiary)" }}>
                    <path d="M6.5 2L11.5 8H1.5L6.5 2Z"
                      fill={isVoted ? "currentColor" : "none"}
                      stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                  </svg>
                  <span className="text-[11px] font-semibold tabular-nums"
                    style={{ color: isVoted ? "var(--purple)" : "var(--text-tertiary)" }}>
                    {post.upvote_count}
                  </span>
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0 flex gap-3">
                  <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1 mb-1">
                    {badge?.label && (
                      <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5", badge.color)}>
                        {badge.emoji && <span>{badge.emoji}</span>}
                        {badge.label}
                      </span>
                    )}
                    {post.product && (
                      <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", PRODUCT_BADGE[post.product] ?? "bg-gray-50 text-gray-500")}>
                        {post.product}
                      </span>
                    )}
                  </div>
                  {/* HN/GeekNews 스타일: 제목 + (도메인) */}
                  <h3 className="text-sm font-medium leading-snug mb-1 group-hover:text-[var(--purple)] transition-colors line-clamp-2">
                    {post.title}
                    {post.source_url && (() => {
                      try {
                        const domain = new URL(post.source_url).hostname.replace("www.", "");
                        return (
                          <a href={post.source_url} target="_blank" rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="ml-2 inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--purple)] hover:bg-[var(--purple-light)] transition-colors border border-[var(--border-light)]">
                            <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                              <path d="M1.5 8.5L8.5 1.5M8.5 1.5H3M8.5 1.5V7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            {domain}
                          </a>
                        );
                      } catch { return null; }
                    })()}
                  </h3>
                  <p className="text-[11px] text-[var(--text-tertiary)]">
                    <button
                      onClick={e => { e.stopPropagation(); setAuthorFilter(post.author_name); }}
                      className="hover:text-[var(--purple)] hover:underline transition-colors font-medium">
                      {post.author_name}
                    </button>
                    {" · "}{timeAgo(post.created_at)}{" · "}댓글 {post.comment_count}
                  </p>
                  </div>{/* inner flex-1 end */}

                  {/* 썸네일 — 이미지 있으면 우선, 없으면 YouTube 썸네일 자동 */}
                  {(() => {
                    const thumb = post.image_url ||
                      (post.source_url ? getYouTubeThumbnail(post.source_url) : null);
                    if (!thumb) return null;
                    const isYt = !post.image_url && !!post.source_url;
                    return (
                      <div className={`rounded-xl overflow-hidden shrink-0 self-center bg-gray-50 ${isYt ? "w-24 h-14" : "w-16 h-16"}`}>
                        <img src={thumb} alt="" className="w-full h-full object-cover"
                          onError={e => { (e.currentTarget.parentElement!.style.display="none"); }} />
                      </div>
                    );
                  })()}
                </div>{/* outer flex gap-3 end */}
              </article>
            );
          })}
        </div>
        );
      })()}

      {/* ── Empty (no posts at all) ── */}
      {!loading && posts.length === 0 && !searchQuery && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-12 h-12 rounded-2xl mb-4 flex items-center justify-center"
            style={{ background: "var(--purple-light)" }}>
            <svg width="20" height="20" viewBox="0 0 28 28" fill="none">
              <path d="M14 4C8.477 4 4 8.477 4 14s4.477 10 10 10 10-4.477 10-10S19.523 4 14 4zm0 4a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0 5.5c.828 0 1.5.672 1.5 1.5v5a1.5 1.5 0 01-3 0V15c0-.828.672-1.5 1.5-1.5z"
                fill="var(--purple)" />
            </svg>
          </div>
          <p className="text-sm font-semibold mb-1">{t("no_posts")}</p>
          <p className="text-xs text-[var(--text-tertiary)] mb-5">{t("no_posts_desc")}</p>
          <button
            onClick={() => router.push(`/${locale}/write${active.kind === 'product' ? '?product=' + encodeURIComponent(active.value) : active.kind === 'type' ? '?category=' + active.value : ''}`)}
            className="px-5 py-2.5 text-sm font-semibold text-white rounded-full hover:opacity-90 transition-all"
            style={{ background: "linear-gradient(135deg, #474aff, #a54bff)" }}>
            {t("write_first")}
          </button>
        </div>
      )}

      {showModal && (
        <PostCreateModal
          initialProduct={initialProduct}
          draft={modalDraft}
          onClose={() => { setShowModal(false); setModalDraft(undefined); }}
          onSuccess={fetchPosts}
        />
      )}
    </>
  );
}
