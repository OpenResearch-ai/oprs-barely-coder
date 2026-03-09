import { notFound } from "next/navigation";
import Header from "@/components/layout/Header";
import ChatBot from "@/components/chatbot/ChatBot";
import PostInteractions from "@/components/posts/PostInteractions";
import { createClient } from "@/lib/supabase/server";
import { TYPE_BADGE } from "@/lib/post-categories";
import { cn, extractYouTubeId } from "@/lib/utils";
import { linkify } from "@/lib/linkify";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}일 전`;
  if (h > 0) return `${h}시간 전`;
  return "방금 전";
}

const PRODUCT_BADGE: Record<string, string> = {
  "oo.ai":    "bg-violet-50 text-violet-700",
  "o talk":   "bg-blue-50 text-blue-700",
  "platform": "bg-gray-50 text-gray-600",
};

export default async function PostPage({ params }: Props) {
  const { locale, id } = await params;
  const supabase = await createClient();

  const { data: post } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .eq("status", "active")
    .single();

  if (!post) notFound();

  const { data: comments } = await supabase
    .from("comments")
    .select("*")
    .eq("post_id", id)
    .order("created_at", { ascending: true });

  const badge = TYPE_BADGE[post.post_type as string];

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="max-w-6xl mx-auto px-4 pb-40 page-top">

        {/* Back */}
        <div className="pt-6 pb-4">
          <a href={`/${locale}`}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--foreground)] transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            커뮤니티로
          </a>
        </div>

        {/* Post body */}
        <article className="pb-2">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            {badge?.label && (
              <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-0.5", badge.color)}>
                {badge.emoji && <span>{badge.emoji}</span>}
                {badge.label}
              </span>
            )}
            {post.product && (
              <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full",
                PRODUCT_BADGE[post.product] ?? "bg-gray-50 text-gray-500")}>
                {post.product}
              </span>
            )}
          </div>

          {/* YouTube 임베드 — source_url이 YouTube인 경우 */}
          {post.source_url && extractYouTubeId(post.source_url) && (
            <div className="mb-5 rounded-2xl overflow-hidden border border-[var(--border-light)] bg-black"
              style={{ aspectRatio: "16/9" }}>
              <iframe
                src={`https://www.youtube.com/embed/${extractYouTubeId(post.source_url)}?rel=0`}
                title={post.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          )}

          {/* Title + URL (HN style) */}
          <h1 className="text-2xl font-bold leading-snug mb-1">{post.title}</h1>
          {post.source_url && (() => {
            try {
              const domain = new URL(post.source_url).hostname.replace("www.", "");
              return (
                <a href={post.source_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[var(--text-tertiary)] hover:text-[var(--purple)] transition-colors mb-3">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M1.5 8.5L8.5 1.5M8.5 1.5H3M8.5 1.5V7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {domain}
                </a>
              );
            } catch { return null; }
          })()}

          {/* Meta */}
          <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)] mb-5">
            <span className="font-medium text-[var(--text-secondary)]">{post.author_name}</span>
            <span>·</span>
            <span>{timeAgo(post.created_at)}</span>
          </div>

          {/* Image — 적당한 크기로 */}
          {post.image_url && (
            <div className="mb-5 rounded-xl overflow-hidden border border-[var(--border-light)] inline-block max-w-sm">
              <img src={post.image_url} alt="" className="w-full object-cover max-h-48" />
            </div>
          )}

          {/* Content — URLs auto-linked */}
          {post.content && (
            <div className="text-[15px] leading-relaxed text-[var(--foreground)] whitespace-pre-wrap">
              {linkify(post.content).map((part, i) =>
                part.type === "link" ? (
                  <a key={i} href={part.href} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium border-b-2 transition-colors"
                    style={{ color: "var(--purple)", borderColor: "rgba(71,74,255,0.3)" }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--purple)")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(71,74,255,0.3)")}>
                    <svg width="11" height="11" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}>
                      <path d="M1.5 8.5L8.5 1.5M8.5 1.5H3M8.5 1.5V7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {part.content}
                  </a>
                ) : (
                  <span key={i}>{part.content}</span>
                )
              )}
            </div>
          )}
        </article>

        {/* Upvote, Delete, Comments — client component */}
        <PostInteractions
          postId={post.id}
          authorId={post.author_id}
          initialUpvotes={post.upvote_count}
          initialComments={(comments ?? []) as any}
        />

      </main>
      <ChatBot />
    </div>
  );
}
