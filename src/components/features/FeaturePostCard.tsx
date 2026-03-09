"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface FeaturePost {
  id: string;
  title: string;
  summary: string | null;
  ai_reasoning: string | null;
  call_to_action: string | null;
  post_type: "feature" | "bug" | "improvement";
  product: string | null;
  status: string;
  priority_score: number;
  vote_count: number;
  comment_count: number;
  last_ai_update: string | null;
}

const TYPE_CONFIG = {
  feature:     { label: "기능 요청", color: "bg-violet-50 text-violet-700 border-violet-100" },
  bug:         { label: "버그",      color: "bg-red-50 text-red-600 border-red-100" },
  improvement: { label: "개선",      color: "bg-amber-50 text-amber-700 border-amber-100" },
};

const PRODUCT_COLOR: Record<string, string> = {
  "oo.ai":    "text-violet-600",
  "o talk":   "text-blue-600",
  "platform": "text-gray-500",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "방금 전";
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export default function FeaturePostCard({ post }: { post: FeaturePost }) {
  const [voted, setVoted] = useState(false);
  const [voteCount, setVoteCount] = useState(post.vote_count);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [commentCount, setCommentCount] = useState(post.comment_count);

  const typeConfig = TYPE_CONFIG[post.post_type] ?? TYPE_CONFIG.feature;

  const handleVote = async () => {
    const method = voted ? "DELETE" : "POST";
    setVoted(!voted);
    setVoteCount(c => voted ? c - 1 : c + 1);
    await fetch(`/api/features/${post.id}/vote`, { method });
  };

  const handleComment = async () => {
    if (!comment.trim()) return;
    setSubmitting(true);
    const res = await fetch(`/api/features/${post.id}/comment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: comment }),
    });
    if (res.ok) {
      setComment("");
      setCommentCount(c => c + 1);
      setShowComment(false);
    }
    setSubmitting(false);
  };

  return (
    <div className="rounded-2xl overflow-hidden border transition-all hover:shadow-md"
      style={{ borderColor: "var(--border)", background: "white" }}>

      {/* Top bar — priority indicator */}
      <div className="h-1 w-full" style={{
        background: `linear-gradient(90deg, #474aff ${Math.min(post.priority_score, 100)}%, var(--border-light) ${Math.min(post.priority_score, 100)}%)`,
        opacity: 0.6,
      }} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-4">
          {/* Vote */}
          <button onClick={handleVote}
            className="flex flex-col items-center gap-0.5 shrink-0 pt-0.5 group">
            <div className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
              voted
                ? "text-white"
                : "bg-[var(--surface)] text-[var(--text-tertiary)] group-hover:bg-[var(--purple-light)] group-hover:text-[var(--purple)]"
            )} style={voted ? { background: "linear-gradient(135deg, #474aff, #a54bff)" } : {}}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1.5L11 8H1L6 1.5Z"
                  fill={voted ? "white" : "currentColor"}
                  fillOpacity={voted ? 1 : 0.7}/>
              </svg>
            </div>
            <span className={cn("text-xs font-bold tabular-nums",
              voted ? "text-[var(--purple)]" : "text-[var(--text-tertiary)]")}>
              {voteCount}
            </span>
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", typeConfig.color)}>
                {typeConfig.label}
              </span>
              {post.product && (
                <span className={cn("text-[10px] font-medium", PRODUCT_COLOR[post.product] ?? "text-gray-500")}>
                  {post.product}
                </span>
              )}
              <span className="ml-auto text-[10px] text-[var(--text-tertiary)] flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block"
                  style={{ background: "linear-gradient(135deg, #474aff, #a54bff)" }} />
                AI 큐레이션
                {post.last_ai_update && ` · ${timeAgo(post.last_ai_update)}`}
              </span>
            </div>

            <h3 className="text-sm font-bold mb-2 leading-snug">{post.title}</h3>

            {post.summary && (
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-3">
                {post.summary}
              </p>
            )}

            {/* Call to action */}
            {post.call_to_action && (
              <div className="text-xs font-medium px-3 py-2 rounded-xl mb-3"
                style={{ background: "var(--purple-light)", color: "var(--purple)" }}>
                {post.call_to_action}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowComment(!showComment)}
                className="text-xs text-[var(--text-tertiary)] hover:text-[var(--foreground)] transition-colors flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M10 1.5H2C1.72 1.5 1.5 1.72 1.5 2v6c0 .28.22.5.5.5h1.5L5 10.5 6.5 8.5H10c.28 0 .5-.22.5-.5V2c0-.28-.22-.5-.5-.5z"
                    stroke="currentColor" strokeWidth="1.2" fill="none"/>
                </svg>
                댓글 {commentCount}
              </button>

              {post.ai_reasoning && (
                <span className="text-[10px] text-[var(--text-tertiary)] leading-snug">
                  {post.ai_reasoning}
                </span>
              )}
            </div>

            {/* Comment input */}
            {showComment && (
              <div className="mt-3 flex gap-2 animate-fade-in">
                <input
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleComment()}
                  placeholder="의견을 남겨주세요..."
                  className="flex-1 text-xs px-3 py-2 rounded-xl outline-none border border-[var(--border)] focus:border-[var(--purple-muted)] bg-[var(--surface)]"
                />
                <button onClick={handleComment} disabled={submitting || !comment.trim()}
                  className="px-3 py-2 text-xs font-semibold text-white rounded-xl disabled:opacity-50 transition-all"
                  style={{ background: "linear-gradient(135deg, #474aff, #a54bff)" }}>
                  {submitting ? "..." : "올리기"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
