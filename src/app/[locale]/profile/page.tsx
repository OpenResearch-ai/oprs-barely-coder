"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Header from "@/components/layout/Header";
import ChatBot from "@/components/chatbot/ChatBot";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { isAdmin } from "@/lib/admin";

export default function ProfilePage() {
  const supabase = createClient();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push("/"); return; }
      setUser(data.user);
      setName(data.user.user_metadata?.name ?? data.user.user_metadata?.user_name ?? "");
      setAvatarUrl(data.user.user_metadata?.avatar_url ?? null);
    });
  }, []);

  const handleSave = async () => {
    setLoading(true); setError(""); setSaved(false);
    const { error } = await supabase.auth.updateUser({
      data: { name: name.trim() },
    });
    if (error) setError(error.message);
    else setSaved(true);
    setLoading(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate
    if (!file.type.startsWith("image/")) { setError("이미지 파일만 업로드할 수 있어요."); return; }
    if (file.size > 2 * 1024 * 1024) { setError("2MB 이하 이미지만 업로드할 수 있어요."); return; }

    setUploading(true); setError("");

    // Upload to Supabase Storage
    const ext = file.name.split(".").pop();
    const path = `avatars/${user.id}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadErr) { setError("업로드 실패: " + uploadErr.message); setUploading(false); return; }

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);

    await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
    setAvatarUrl(publicUrl + "?t=" + Date.now()); // bust cache
    setUploading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (!user) return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 rounded-full border-2 border-[var(--purple)] border-t-transparent animate-spin" />
      </div>
    </div>
  );

  const admin = isAdmin(user.email);
  const displayName = admin ? "OpenResearch" : (name || user.email?.split("@")[0]);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="max-w-lg mx-auto px-4 pb-40 page-top">
        <div className="pt-6">
          <h1 className="text-xl font-bold mb-6">프로필</h1>

          {/* Avatar */}
          <div className="flex items-center gap-5 mb-8">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-[var(--border)] bg-[var(--surface)]"
                style={{ aspectRatio: "1/1" }}>
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="프로필" width={80} height={80}
                    className="w-full h-full object-cover" unoptimized />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-white"
                    style={{ background: "linear-gradient(135deg, #474aff, #a54bff)" }}>
                    {displayName[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <button onClick={() => fileRef.current?.click()}
                disabled={uploading || admin}
                className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-white border border-[var(--border)] flex items-center justify-center shadow-sm hover:bg-[var(--surface)] transition-all disabled:opacity-40">
                {uploading ? (
                  <div className="w-3 h-3 rounded-full border border-[var(--purple)] border-t-transparent animate-spin" />
                ) : (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                )}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>

            <div>
              <p className="text-sm font-semibold">{displayName}</p>
              <p className="text-xs text-[var(--text-tertiary)]">{user.email}</p>
              {admin && (
                <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "var(--purple-light)", color: "var(--purple)" }}>
                  Admin · OpenResearch
                </span>
              )}
              {!admin && (
                <p className="text-[10px] text-[var(--text-tertiary)] mt-1">프로필 사진 변경 (2MB 이하)</p>
              )}
            </div>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1.5">닉네임</label>
              <input value={admin ? "OpenResearch (고정)" : name}
                onChange={e => setName(e.target.value)}
                disabled={admin}
                placeholder="닉네임을 입력하세요"
                className="w-full px-4 py-3 text-sm rounded-2xl border border-[var(--border)] outline-none focus:border-[var(--purple-muted)] transition-all disabled:bg-[var(--surface)] disabled:text-[var(--text-tertiary)]" />
              {admin && <p className="text-[10px] text-[var(--text-tertiary)] mt-1">관리자 계정은 항상 OpenResearch로 표시됩니다.</p>}
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1.5">이메일</label>
              <input value={user.email ?? ""} disabled
                className="w-full px-4 py-3 text-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-tertiary)]" />
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}
            {saved && <p className="text-xs text-green-600">저장됐어요!</p>}

            {!admin && (
              <button onClick={handleSave} disabled={loading}
                className="w-full py-3 text-sm font-semibold text-white rounded-2xl disabled:opacity-60 hover:opacity-90 transition-all"
                style={{ background: "linear-gradient(135deg, #474aff, #a54bff)" }}>
                {loading ? "저장 중..." : "저장"}
              </button>
            )}

            {/* 알림 설정 */}
            {"Notification" in window && (
              <div className="pt-4 border-t border-[var(--border-light)]">
                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-2">알림 설정</label>
                <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface)] border border-[var(--border-light)]">
                  <div>
                    <p className="text-sm font-medium">댓글 푸시 알림</p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                      {Notification.permission === "granted" ? "활성화됨" :
                       Notification.permission === "denied" ? "브라우저에서 차단됨" : "비활성화"}
                    </p>
                  </div>
                  {Notification.permission === "granted" ? (
                    <button
                      onClick={async () => {
                        await fetch("/api/push/unsubscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
                        alert("알림이 해제되었어요. 브라우저 설정에서도 차단해주세요.");
                      }}
                      className="text-xs text-red-500 hover:underline">
                      해제
                    </button>
                  ) : Notification.permission === "default" ? (
                    <button
                      onClick={async () => {
                        const p = await Notification.requestPermission();
                        if (p === "granted") window.location.reload();
                      }}
                      className="text-xs font-semibold px-3 py-1.5 rounded-full text-white"
                      style={{ background: "linear-gradient(135deg, #474aff, #a54bff)" }}>
                      허용
                    </button>
                  ) : null}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-[var(--border-light)]">
              <button onClick={handleSignOut}
                className="w-full py-3 text-sm font-medium text-red-500 rounded-2xl hover:bg-red-50 transition-all border border-red-100">
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </main>
      <ChatBot />
    </div>
  );
}
