"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    // Supabase sets the session from the URL hash automatically
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        // ready to update password
      }
    });
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError("비밀번호는 6자 이상이어야 해요."); return; }
    if (password !== confirm) { setError("비밀번호가 일치하지 않아요."); return; }
    setLoading(true); setError("");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setError(error.message);
    else setDone(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-white">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl overflow-hidden mx-auto mb-4" style={{ aspectRatio: "1/1" }}>
            <Image src="/oprs_logo.jpeg" alt="OpenResearch" width={56} height={56} className="w-full h-full object-contain" />
          </div>
          <h1 className="text-xl font-bold mb-1">새 비밀번호 설정</h1>
          <p className="text-sm text-[var(--text-secondary)]">OpenResearch 계정의 새 비밀번호를 입력해주세요.</p>
        </div>

        {done ? (
          <div className="text-center py-8">
            <p className="text-4xl mb-4">✅</p>
            <p className="text-base font-bold mb-2">비밀번호가 변경됐어요!</p>
            <a href="/ko"
              className="inline-block mt-4 px-6 py-2.5 text-sm font-semibold text-white rounded-full"
              style={{ background: "linear-gradient(135deg, #474aff, #a54bff)" }}>
              홈으로 돌아가기
            </a>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-3">
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="새 비밀번호 (6자 이상)" required minLength={6}
              className="w-full px-4 py-3 text-sm rounded-2xl border border-[var(--border)] outline-none focus:border-[var(--purple-muted)] transition-all"
            />
            <input
              type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              placeholder="비밀번호 확인" required
              className="w-full px-4 py-3 text-sm rounded-2xl border border-[var(--border)] outline-none focus:border-[var(--purple-muted)] transition-all"
            />
            {error && <p className="text-xs text-red-500 px-1">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-3 text-sm font-semibold text-white rounded-2xl disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #474aff, #a54bff)" }}>
              {loading ? "변경 중..." : "비밀번호 변경"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
