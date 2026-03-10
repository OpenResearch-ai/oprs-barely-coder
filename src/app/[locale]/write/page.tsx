"use client";

import { useState, useRef } from "react";
import { useLocale } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/layout/Header";
import CategoryPicker from "@/components/community/CategoryPicker";
import { useAuth } from "@/hooks/useAuth";
import LoginModal from "@/components/auth/LoginModal";
import Image from "next/image";
import type { PostType } from "@/lib/post-categories";

export default function WritePage() {
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const initProduct = searchParams.get("product") ?? "";
  const initCategory = searchParams.get("category") as PostType | null;
  // URL에 카테고리/제품이 명시된 경우만 선택, 그 외엔 비워둠
  const [category, setCategory] = useState<PostType | "">(
    initProduct ? "community" : (initCategory ?? "")
  );
  const [product, setProduct] = useState(initProduct);
  const [categoryChangedBy, setCategoryChangedBy] = useState<string | null>(null); // AI 자동완성 알림
  const [title, setTitle] = useState(searchParams.get("title") ?? "");
  const [content, setContent] = useState(searchParams.get("content") ?? "");
  const [url, setUrl] = useState("");
  const [imageUrl, setImageUrl] = useState(""); // final image URL for the post
  const [ogImageUrl, setOgImageUrl] = useState(""); // suggested OG image from URL
  const [uploadedImageUrl, setUploadedImageUrl] = useState(""); // user-uploaded image

  const [urlLoading, setUrlLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [urlNotice, setUrlNotice] = useState("");
  const [error, setError] = useState("");

  const fetchUrl = async () => {
    if (!url.trim()) return;
    setUrlLoading(true); setUrlNotice("");
    try {
      const res = await fetch("/api/posts/parse-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), category, product }),
      });
      const data = await res.json();
      if (data.title) setTitle(data.title);
      if (data.summary) setContent(data.summary);
      if (data.category && data.category !== category) {
        const prev = category;
        setCategory(data.category as PostType);
        if (prev) {
          // 기존 카테고리가 있었으면 변경 알림
          setCategoryChangedBy(data.category);
        } else {
          // 비어있었으면 그냥 선택 (알림 없음)
          setCategoryChangedBy(null);
        }
      }
      if (data.notice) setUrlNotice(data.notice);
      // Suggest OG image if available and no image selected yet
      if (data.imageUrl && !imageUrl) {
        setOgImageUrl(data.imageUrl);
      }
    } catch { /* ignore */ }
    finally { setUrlLoading(false); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("5MB 이하 이미지만 업로드할 수 있어요."); return; }
    setUploading(true); setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/posts/upload-image", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "업로드 실패"); return; }
      setUploadedImageUrl(data.url);
      setImageUrl(data.url);
      setOgImageUrl(""); // OG 제안 해제
    } catch { setError("업로드에 실패했어요."); }
    finally { setUploading(false); }
  };

  const useOgImage = () => { setImageUrl(ogImageUrl); setOgImageUrl(""); };
  const removeImage = () => { setImageUrl(""); setUploadedImageUrl(""); setOgImageUrl(""); };

  const handleSubmit = async () => {
    if (!category) { setError("카테고리를 선택해주세요."); return; }
    if (!title.trim()) { setError("제목을 입력해주세요."); return; }
    setSubmitting(true); setError("");
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim() || null,
          post_type: category || "community",
          product: product || null,
          source_url: url.trim() || null,
          image_url: imageUrl || null,
          locale: navigator.language?.split("-")[0] ?? locale,
        }),
      });
      const data = await res.json();
      if (res.status === 403) { setError(data.message ?? "이용이 제한되었습니다."); setSubmitting(false); return; }
      if (res.status === 422) {
        setError((data.message ?? "규칙에 맞지 않는 내용이에요.") + (data.banned ? "\n24시간 이용 제한됩니다." : ""));
        setSubmitting(false); return;
      }
      if (res.status === 429) { setError(data.message ?? "잠시 후 다시 시도해주세요."); setSubmitting(false); return; }
      if (!res.ok) throw new Error("Failed");
      // 성공 시 submitting 유지 — 중복 제출 방지
      if (data.status === "pending") {
        alert("✅ 제출됐어요!\n검토 후 게시됩니다.");
        router.push("/");
      } else {
        router.push(`/posts/${data.post.id}`);
      }
    } catch { setError("글 작성에 실패했어요. 다시 시도해주세요."); setSubmitting(false); }
  };

  if (!loading && !user) {
    return <LoginModal onClose={() => router.push("/")} redirectTo="/write" />;
  }
  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-[var(--purple)] border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="max-w-6xl mx-auto px-4 pb-20 page-top">
        <div className="pt-6 pb-5 flex items-center gap-3 border-b border-[var(--border-light)]">
          <button onClick={() => router.back()}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--surface)] transition-all text-[var(--text-secondary)]">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h1 className="text-base font-bold">새 글 작성</h1>
        </div>

        <div className="py-6 space-y-6">
          {/* ① URL */}
          <div>
            <label className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-2">링크 (선택)</label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border border-[var(--border-light)] bg-[var(--surface)]">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-[var(--text-tertiary)] shrink-0">
                  <path d="M5.5 8.5s.5 1.5 2 1.5h2a2.5 2.5 0 000-5h-1M8.5 5.5s-.5-1.5-2-1.5h-2a2.5 2.5 0 000 5h1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                <input value={url} onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && fetchUrl()}
                  placeholder="https://..."
                  className="flex-1 text-sm bg-transparent outline-none placeholder:text-[var(--text-tertiary)]" />
                {url && <button onClick={() => { setUrl(""); setOgImageUrl(""); }} className="text-[var(--text-tertiary)] text-xs">✕</button>}
              </div>
              <button onClick={fetchUrl} disabled={!url.trim() || urlLoading}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-[var(--purple)] text-[var(--purple)] hover:bg-[var(--purple-light)] disabled:opacity-40 transition-all shrink-0">
                {urlLoading ? "분석 중..." : "AI 자동완성"}
              </button>
            </div>
            {urlNotice && <p className="text-[10px] text-amber-600 mt-1.5 bg-amber-50 px-2 py-1 rounded-lg">⚠️ {urlNotice}</p>}
          </div>

          <div className="h-px bg-[var(--border-light)]" />

          {/* ② 카테고리 */}
          <div>
            <label className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-2.5">
              카테고리 <span className="text-red-400">*</span>
            </label>

            {/* AI 카테고리 변경 알림 */}
            {categoryChangedBy && (
              <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-xl text-xs"
                style={{ background: "var(--purple-light)", color: "var(--purple)" }}>
                <span>🤖</span>
                <span>AI가 카테고리를 <strong>{categoryChangedBy}</strong>으로 변경했어요. 맞지 않으면 직접 선택해주세요.</span>
                <button onClick={() => setCategoryChangedBy(null)} className="ml-auto opacity-60 hover:opacity-100 font-bold shrink-0">×</button>
              </div>
            )}

            <CategoryPicker value={category} onChange={v => { setCategory(v as PostType); setCategoryChangedBy(null); }} product={product} onProductChange={setProduct} />
          </div>

          {/* ③ 제목 */}
          <div>
            <textarea value={title} onChange={e => { if (e.target.value.length <= 100) { setTitle(e.target.value); setError(""); const t = e.target; t.style.height = "auto"; t.style.height = t.scrollHeight + "px"; } }}
              placeholder="제목을 입력하세요"
              rows={1} maxLength={100}
              className="w-full text-xl font-bold outline-none resize-none placeholder:text-[var(--text-tertiary)] leading-snug bg-transparent overflow-hidden" />
            <div className={`text-[10px] text-right mt-1 ${title.length >= 90 ? "text-orange-500" : "text-[var(--text-tertiary)]"}`}>
              {title.length}/100
            </div>
          </div>

          <div className="h-px bg-[var(--border-light)]" />

          {/* ④ 내용 */}
          <div>
            <textarea value={content} onChange={e => { if (e.target.value.length <= 3000) setContent(e.target.value); }}
              placeholder="내용을 입력하세요 (선택)"
              rows={8} maxLength={3000}
              className="w-full text-sm outline-none resize-none placeholder:text-[var(--text-tertiary)] leading-relaxed bg-transparent" />
            {content.length > 0 && (
              <div className={`text-[10px] text-right mt-1 ${content.length >= 2700 ? "text-orange-500" : "text-[var(--text-tertiary)]"}`}>
                {content.length}/3,000
              </div>
            )}
          </div>

          {/* ⑤ 이미지 */}
          <div>
            <label className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-2">이미지 (선택)</label>

            {/* OG 이미지 제안 */}
            {ogImageUrl && !imageUrl && (
              <div className="mb-3 p-3 rounded-xl border border-[var(--border-light)] bg-[var(--surface)]">
                <p className="text-xs text-[var(--text-secondary)] mb-2">링크에서 대표 이미지를 찾았어요. 글에 추가할까요?</p>
                <div className="flex gap-2 items-start">
                  <div className="w-20 h-16 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                    <img src={ogImageUrl} alt="" className="w-full h-full object-cover"
                      onError={() => setOgImageUrl("")} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <button onClick={useOgImage}
                      className="px-3 py-1.5 text-xs font-semibold text-white rounded-full"
                      style={{ background: "linear-gradient(135deg, #474aff, #a54bff)" }}>
                      이미지 추가
                    </button>
                    <button onClick={() => setOgImageUrl("")}
                      className="px-3 py-1.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--foreground)] transition-colors">
                      건너뛰기
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 선택된 이미지 미리보기 */}
            {imageUrl && (
              <div className="relative mb-3 rounded-xl overflow-hidden border border-[var(--border-light)]">
                <img src={imageUrl} alt="첨부 이미지" className="w-full max-h-64 object-cover" />
                <button onClick={removeImage}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center text-white text-xs hover:bg-black/70 transition-all">
                  ✕
                </button>
              </div>
            )}

            {/* 업로드 버튼 */}
            {!imageUrl && (
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-[var(--border)] text-xs text-[var(--text-secondary)] hover:border-[var(--purple-muted)] hover:text-[var(--purple)] transition-all w-full justify-center disabled:opacity-50">
                {uploading ? (
                  <div className="w-4 h-4 rounded-full border-2 border-[var(--purple)] border-t-transparent animate-spin" />
                ) : (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                )}
                {uploading ? "업로드 중..." : "이미지 업로드"}
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            <p className="text-[10px] text-[var(--text-tertiary)] mt-1.5">JPG, PNG, WebP, GIF · 최대 5MB</p>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200">
              <p className="text-xs font-semibold text-red-700 mb-1">게시할 수 없어요</p>
              <p className="text-xs text-red-600 whitespace-pre-line leading-relaxed">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button onClick={handleSubmit} disabled={submitting || !title.trim() || !category}
            className="w-full py-3.5 text-sm font-semibold text-white rounded-2xl disabled:opacity-50 hover:opacity-90 transition-all"
            style={{ background: "linear-gradient(135deg, #474aff, #a54bff)" }}>
            {submitting ? "게시 중..." : "글 올리기"}
          </button>
        </div>
      </main>
    </div>
  );
}
