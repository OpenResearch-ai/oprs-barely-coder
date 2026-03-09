"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { isAdmin } from "@/lib/admin";
import LoginModal from "@/components/auth/LoginModal";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface Comment {
  id: string;
  author_id: string | null;
  author_name: string;
  author_avatar: string | null;
  content: string;
  image_url?: string | null;
  created_at: string;
  parent_id: string | null;
}

interface Props {
  postId: string;
  authorId: string | null;
  initialUpvotes: number;
  initialComments: Comment[];
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

function Avatar({ name, avatar }: { name: string; avatar?: string | null }) {
  if (name === "OpenResearch") {
    return (
      <div className="w-7 h-7 rounded-full overflow-hidden shrink-0" style={{ aspectRatio: "1/1" }}>
        <Image src="/oprs_logo.jpeg" alt="OpenResearch" width={28} height={28}
          className="w-full h-full object-contain" unoptimized />
      </div>
    );
  }
  if (avatar) {
    return (
      <div className="w-7 h-7 rounded-full overflow-hidden shrink-0" style={{ aspectRatio: "1/1" }}>
        <Image src={avatar} alt={name} width={28} height={28}
          className="w-full h-full object-cover" unoptimized />
      </div>
    );
  }
  return (
    <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
      style={{ background: "linear-gradient(135deg, #474aff, #a54bff)" }}>
      {name[0]?.toUpperCase()}
    </div>
  );
}

export default function PostInteractions({ postId, authorId, initialUpvotes, initialComments }: Props) {
  const router = useRouter();
  const locale = useLocale();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<any>(null);
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [upvoted, setUpvoted] = useState(false);
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [commentText, setCommentText] = useState("");
  const [commentImage, setCommentImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user);
      if (data.user) {
        const { data: vote } = await supabase
          .from("votes").select("id").eq("post_id", postId).eq("user_id", data.user.id).maybeSingle();
        if (vote) setUpvoted(true);
      }
    });
  }, [postId]);

  const scrollToInput = () => {
    inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => inputRef.current?.focus(), 300);
  };

  const handleUpvote = async () => {
    if (!user) { setShowLogin(true); return; }
    const supabase = createClient();
    if (upvoted) {
      setUpvoted(false); setUpvotes(v => v - 1);
      await supabase.from("votes").delete().eq("post_id", postId).eq("user_id", user.id);
    } else {
      setUpvoted(true); setUpvotes(v => v + 1);
      await supabase.from("votes").insert({ post_id: postId, user_id: user.id });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("5MB 이하 이미지만 첨부할 수 있어요."); return; }
    setUploading(true); setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/posts/upload-image", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "업로드 실패"); return; }
      setCommentImage(data.url);
    } catch { setError("업로드 실패"); }
    finally { setUploading(false); }
  };

  const startReply = (comment: Comment) => {
    if (!user) { setShowLogin(true); return; }
    setReplyTo({ id: comment.id, name: comment.author_name });
    scrollToInput();
  };

  const handleComment = async () => {
    if (!user) { setShowLogin(true); return; }
    if (!commentText.trim() && !commentImage) return;
    setSubmitting(true); setError("");
    try {
      const res = await fetch(`/api/posts/${postId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: commentText.trim(),
          parent_id: replyTo?.id ?? null,
          image_url: commentImage || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? "댓글 작성에 실패했어요."); return; }
      setComments(prev => [...prev, data.comment]);
      setCommentText("");
      setCommentImage("");
      setReplyTo(null);
    } catch { setError("댓글 작성에 실패했어요."); }
    finally { setSubmitting(false); }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("이 댓글을 삭제할까요?")) return;
    const res = await fetch(`/api/posts/${postId}/comment?commentId=${commentId}`, { method: "DELETE" });
    if (res.ok) setComments(prev => prev.filter(c => c.id !== commentId && c.parent_id !== commentId));
  };

  const handleDeletePost = async () => {
    if (!confirm("이 글을 삭제할까요?")) return;
    setDeleting(true);
    const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
    if (res.ok) router.push(`/${locale}`);
    else setDeleting(false);
  };

  const canDeletePost = user && (user.id === authorId || isAdmin(user.email));
  const canDeleteComment = (c: Comment) => user && (user.id === c.author_id || isAdmin(user.email));

  const roots = comments.filter(c => !c.parent_id);
  const replies = (parentId: string) => comments.filter(c => c.parent_id === parentId);

  const CommentItem = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => (
    <div className={cn("flex gap-2.5", isReply && "ml-9 mt-3")}>
      <Avatar name={comment.author_name} avatar={comment.author_avatar} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={cn("text-xs font-bold", comment.author_name === "OpenResearch" && "text-[var(--purple)]")}>
            {comment.author_name}
          </span>
          <span className="text-[10px] text-[var(--text-tertiary)]">{timeAgo(comment.created_at)}</span>
        </div>
        <p className="text-sm text-[var(--foreground)] leading-relaxed whitespace-pre-wrap break-words">
          {comment.content}
        </p>
        {comment.image_url && (
          <div className="mt-2 rounded-xl overflow-hidden inline-block max-w-xs border border-[var(--border-light)]">
            <img src={comment.image_url} alt="" className="w-full object-cover max-h-48"
              onError={e => (e.currentTarget.parentElement!.style.display = "none")} />
          </div>
        )}
        <div className="flex items-center gap-3 mt-1.5">
          {!isReply && (
            <button onClick={() => startReply(comment)}
              className="text-[10px] text-[var(--text-tertiary)] hover:text-[var(--purple)] transition-colors font-medium">
              답글
            </button>
          )}
          {canDeleteComment(comment) && (
            <button onClick={() => handleDeleteComment(comment.id)}
              className="text-[10px] text-red-400 hover:text-red-600 transition-colors">
              삭제
            </button>
          )}
        </div>
        {!isReply && replies(comment.id).map(reply => (
          <CommentItem key={reply.id} comment={reply} isReply />
        ))}
      </div>
    </div>
  );

  const myName = user ? (isAdmin(user.email) ? "OpenResearch" : (user.user_metadata?.name ?? user.email?.split("@")[0] ?? "")) : "";
  const myAvatar = user && !isAdmin(user.email) ? user.user_metadata?.avatar_url : null;

  return (
    <div>
      {/* Upvote + Delete */}
      <div className="flex items-center justify-between py-5 border-b border-[var(--border-light)]">
        <button onClick={handleUpvote}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all",
            upvoted
              ? "bg-[var(--purple)] text-white border-[var(--purple)]"
              : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--purple-muted)]"
          )}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2L12.5 9H1.5L7 2Z"
              fill={upvoted ? "white" : "none"}
              stroke={upvoted ? "white" : "currentColor"} strokeWidth="1.3" strokeLinejoin="round"/>
          </svg>
          추천 {upvotes}
        </button>
        {canDeletePost && (
          <button onClick={handleDeletePost} disabled={deleting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 bg-red-50 border border-red-100 rounded-full hover:bg-red-100 transition-all disabled:opacity-40">
            {deleting ? <div className="w-3 h-3 rounded-full border border-red-400 border-t-transparent animate-spin" /> :
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M1.5 3h8M4 3V2h3v1M2.5 3l.5 6h5l.5-6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>}
            {deleting ? "삭제 중" : "삭제"}
          </button>
        )}
      </div>

      {/* Comments */}
      <section className="pt-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-bold">댓글 {comments.length}</h2>
          <button onClick={() => { if (!user) { setShowLogin(true); return; } scrollToInput(); }}
            className="text-xs font-semibold px-3 py-1.5 rounded-full text-[var(--purple)] bg-[var(--purple-light)] hover:opacity-80 transition-all">
            댓글 달기
          </button>
        </div>

        {roots.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)] text-center py-8">첫 댓글을 남겨보세요!</p>
        ) : (
          <div className="space-y-5 mb-8">
            {roots.map(comment => <CommentItem key={comment.id} comment={comment} />)}
          </div>
        )}

        {/* Comment input */}
        <div className="pt-5 border-t border-[var(--border-light)]">
          {user ? (
            <div className="flex gap-2.5">
              <Avatar name={myName} avatar={myAvatar} />
              <div className="flex-1 space-y-2">
                {replyTo && (
                  <div className="flex items-center gap-2 text-xs text-[var(--purple)] bg-[var(--purple-light)] px-3 py-1.5 rounded-xl">
                    <span>@{replyTo.name} 에게 답글</span>
                    <button onClick={() => setReplyTo(null)} className="ml-auto opacity-60 hover:opacity-100 font-bold">×</button>
                  </div>
                )}
                <textarea ref={inputRef} value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && e.metaKey) handleComment(); }}
                  placeholder={replyTo ? `@${replyTo.name}에게 답글...` : "댓글을 입력하세요 (Cmd+Enter)"}
                  rows={3}
                  className="w-full text-sm px-3 py-2.5 rounded-2xl border border-[var(--border-light)] outline-none focus:border-[var(--purple-muted)] resize-none bg-[var(--surface)] leading-relaxed transition-all" />

                {/* 이미지 미리보기 */}
                {commentImage && (
                  <div className="relative inline-block">
                    <img src={commentImage} alt="" className="h-24 w-auto rounded-xl border border-[var(--border-light)] object-cover" />
                    <button onClick={() => setCommentImage("")}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] hover:bg-red-600">
                      ✕
                    </button>
                  </div>
                )}

                {error && <p className="text-xs text-red-500">{error}</p>}

                <div className="flex items-center justify-between">
                  {/* 이미지 첨부 버튼 */}
                  <button onClick={() => fileRef.current?.click()} disabled={uploading || !!commentImage}
                    className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--purple)] transition-colors disabled:opacity-40">
                    {uploading ? (
                      <div className="w-3.5 h-3.5 rounded-full border border-[var(--purple)] border-t-transparent animate-spin" />
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <rect x="1.5" y="2.5" width="11" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                        <circle cx="4.5" cy="5.5" r="1" fill="currentColor"/>
                        <path d="M1.5 9l3-3 2.5 2.5 2-2 3 3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                    {uploading ? "업로드 중..." : "이미지"}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

                  <button onClick={handleComment} disabled={submitting || (!commentText.trim() && !commentImage)}
                    className="px-4 py-1.5 text-xs font-semibold text-white rounded-full disabled:opacity-50 hover:opacity-90 transition-all"
                    style={{ background: "linear-gradient(135deg, #474aff, #a54bff)" }}>
                    {submitting ? "올리는 중..." : replyTo ? "답글 올리기" : "댓글 올리기"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowLogin(true)}
              className="w-full py-3 text-sm text-[var(--text-secondary)] border border-dashed border-[var(--border)] rounded-2xl hover:border-[var(--purple-muted)] hover:text-[var(--purple)] transition-all">
              댓글을 달려면 로그인이 필요해요
            </button>
          )}
        </div>
      </section>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </div>
  );
}
