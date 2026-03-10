"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import LoginModal from "@/components/auth/LoginModal";
import CategoryPicker from "./CategoryPicker";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  initialProduct?: string | null;
  draft?: { title?: string; content?: string; category?: string };
}

import type { PostType } from "@/lib/post-categories";
type WriteMode = "text" | "url";

const PRODUCTS = [
  { value: "",          label: "작품 선택 안함" },
  { value: "oo.ai",    label: "oo.ai" },
  { value: "o talk",   label: "o talk" },
  { value: "platform", label: "openresearch.ai" },
];

export default function PostCreateModal({ onClose, onSuccess, initialProduct, draft }: Props) {
  const { user } = useAuth();
  const [mode, setMode] = useState<WriteMode>("text");
  const [url, setUrl] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [title, setTitle] = useState(draft?.title ?? "");
  const [content, setContent] = useState(draft?.content ?? "");
  const [postType, setPostType] = useState<PostType>((draft?.category as PostType) ?? "vibe_coding");
  const [product, setProduct] = useState(initialProduct ?? "");
  const [prefix, setPrefix] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!user) return <LoginModal onClose={onClose} />;

  // URL 자동완성 — AI가 URL을 분석해 제목/내용 생성
  const fetchFromUrl = async () => {
    if (!url.trim()) return;
    setUrlLoading(true);
    setError("");
    try {
      const res = await fetch("/api/posts/parse-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (data.title) setTitle(data.title);
      if (data.summary) setContent(data.summary);
      if (data.category) setPostType(data.category as PostType);
      // Switch to text mode to review/edit
      setMode("text");
    } catch {
      setError("URL을 불러오지 못했어요. 직접 입력해주세요.");
    } finally {
      setUrlLoading(false);
    }
  };

  const submit = async () => {
    // URL-only mode: use bot poster
    if (mode === "url" && url.trim() && !title.trim()) {
      setLoading(true);
      try {
        const res = await fetch("/api/posts/from-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: url.trim(), authorId: user.id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed");
        onSuccess();
        onClose();
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!title.trim()) { setError("제목을 입력해주세요."); return; }
    setLoading(true);
    setError("");

    const finalTitle = (postType === "etc" && prefix)
      ? `[${prefix}] ${title.trim()}`
      : title.trim();

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: finalTitle,
          content: content.trim() || null,
          post_type: postType,
          product: product || null,
          locale: navigator.language?.split("-")[0] ?? "ko",
          source_url: url.trim() || null,
        }),
      });

      const data = await res.json();

      if (res.status === 403) { setError(data.message ?? "이용이 제한되었습니다."); setLoading(false); return; }
      if (res.status === 422) {
        const banNote = data.banned ? "\n\n반복 위반으로 24시간 이용이 제한됩니다." : "";
        setError((data.message ?? "규칙에 맞지 않는 내용이에요.") + banNote);
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error("Failed");

      onSuccess();
      onClose();
      if (data.status === "pending") alert("✅ 제출됐어요!\n검토 후 게시됩니다.");
    } catch {
      setError("글 작성에 실패했어요. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>

      <div className="w-full max-w-lg rounded-3xl overflow-hidden animate-slide-up bg-white"
        style={{ boxShadow: "0 24px 80px rgba(0,0,0,0.15)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[var(--border-light)]">
          <div className="flex gap-1 p-0.5 rounded-xl bg-[var(--surface)]">
            {([["text", "직접 작성"], ["url", "URL로 작성"]] as [WriteMode, string][]).map(([m, label]) => (
              <button key={m} onClick={() => setMode(m)}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                  mode === m ? "bg-white text-[var(--foreground)] shadow-sm" : "text-[var(--text-tertiary)]"
                )}>
                {label}
              </button>
            ))}
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[var(--surface)] text-[var(--text-tertiary)]">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M11 2L2 11M2 2l9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">

          {/* URL mode */}
          {mode === "url" && (
            <div className="space-y-3">
              <p className="text-xs text-[var(--text-secondary)]">
                URL을 입력하면 AI가 제목과 내용을 자동으로 작성해드려요.
              </p>
              <div className="flex gap-2">
                <input
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && fetchFromUrl()}
                  placeholder="https://..."
                  className="flex-1 px-3 py-2.5 text-sm rounded-xl border border-[var(--border)] outline-none focus:border-[var(--purple-muted)] bg-white"
                />
                <button onClick={fetchFromUrl} disabled={!url.trim() || urlLoading}
                  className="px-4 py-2.5 text-xs font-semibold text-white rounded-xl disabled:opacity-50 shrink-0"
                  style={{ background: "linear-gradient(135deg, #474aff, #a54bff)" }}>
                  {urlLoading ? "분석 중..." : "가져오기"}
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-[var(--border-light)]" />
                <span className="text-[10px] text-[var(--text-tertiary)]">또는 URL만으로 즉시 게시</span>
                <div className="flex-1 h-px bg-[var(--border-light)]" />
              </div>
              <button onClick={submit} disabled={!url.trim() || loading}
                className="w-full py-2.5 text-sm font-semibold text-white rounded-xl disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #474aff, #a54bff)" }}>
                {loading ? "게시 중..." : "AI가 작성해서 바로 게시"}
              </button>
            </div>
          )}

          {/* Text mode */}
          {mode === "text" && (
            <>
              {/* URL 선택 (옵션) */}
              {url && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--purple-light)] text-xs text-[var(--purple)]">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M1.5 8.5L8.5 1.5M8.5 1.5H3M8.5 1.5V7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                  <span className="truncate">{url}</span>
                  <button onClick={() => setUrl("")} className="shrink-0 opacity-60 hover:opacity-100">×</button>
                </div>
              )}

              {/* URL 추가 (text mode에서도) */}
              {!url && (
                <button onClick={() => setMode("url")}
                  className="text-xs text-[var(--text-tertiary)] hover:text-[var(--purple)] transition-colors flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                  URL 첨부하기
                </button>
              )}

              {/* Category — same component as write page & community feed */}
              <CategoryPicker value={postType} onChange={(key) => { setPostType(key as PostType); setPrefix(""); }} />

              {/* 말머리 — 기타 카테고리 선택 시 표시 */}
              {postType === "etc" && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider shrink-0">말머리</span>
                  {(["없음", "OpenResearch 커뮤니티", "Oh Taro", "서비스제안"] as const).map(p => (
                    <button key={p} type="button"
                      onClick={() => setPrefix(p === "없음" ? "" : p)}
                      className={cn(
                        "px-2.5 py-1 text-xs font-medium rounded-full border transition-all",
                        (p === "없음" ? prefix === "" : prefix === p)
                          ? "border-[var(--purple)] bg-[var(--purple)] text-white"
                          : "bg-[var(--surface)] text-[var(--text-tertiary)] border-[var(--border-light)] hover:border-[var(--border)]"
                      )}>
                      {p}
                    </button>
                  ))}
                </div>
              )}

              {/* Title */}
              <div>
                <input value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="제목을 입력하세요"
                  className="w-full text-base font-semibold outline-none placeholder:text-[var(--text-tertiary)] bg-transparent"
                  maxLength={120} />
                <div className="text-[10px] text-right text-[var(--text-tertiary)] mt-1">{title.length}/120</div>
              </div>

              {/* Content */}
              <textarea value={content} onChange={e => setContent(e.target.value)}
                placeholder="내용 (선택)"
                rows={4}
                className="w-full text-sm outline-none resize-none placeholder:text-[var(--text-tertiary)] bg-[var(--surface)] rounded-xl p-3 leading-relaxed" />

              {/* Product */}
              <select value={product} onChange={e => setProduct(e.target.value)}
                className="w-full text-sm bg-[var(--surface)] rounded-xl px-3 py-2.5 outline-none border border-[var(--border-light)]">
                {PRODUCTS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>

              {/* Author */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border-light)]">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                  style={{ background: "linear-gradient(135deg, #474aff, #a54bff)" }}>
                  {(user.user_metadata?.name ?? user.email ?? "U")[0].toUpperCase()}
                </div>
                <span className="text-xs text-[var(--text-secondary)]">
                  {user.user_metadata?.name ?? user.user_metadata?.user_name ?? user.email?.split("@")[0]} 으로 게시
                </span>
              </div>
            </>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        {/* Footer */}
        {mode === "text" && (
          <div className="px-6 pb-6 flex gap-2 justify-end border-t border-[var(--border-light)] pt-4">
            <button onClick={onClose}
              className="px-4 py-2 text-sm text-[var(--text-secondary)] rounded-full hover:bg-[var(--surface)] transition-all">
              취소
            </button>
            <button onClick={submit} disabled={loading || !title.trim()}
              className="px-5 py-2 text-sm font-semibold text-white rounded-full disabled:opacity-50 transition-all"
              style={{ background: "linear-gradient(135deg, #474aff, #a54bff)" }}>
              {loading ? "게시 중..." : "글 올리기"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
