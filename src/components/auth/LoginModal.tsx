"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface Props {
  onClose: () => void;
  redirectTo?: string;
}

type View = "main" | "email" | "forgot";

export default function LoginModal({ onClose, redirectTo }: Props) {
  const [view, setView] = useState<View>("main");
  const [isSignup, setIsSignup] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const reset = () => { setError(""); setSuccess(""); };
  const nextUrl = redirectTo ?? (typeof window !== "undefined" ? window.location.pathname : "/ko");
  const supabase = createClient();

  // ── Google ─────────────────────────────────────────────────────────
  const signInWithGoogle = async () => {
    setGoogleLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${nextUrl}` },
    });
    setGoogleLoading(false);
  };

  // ── Email / Password ─────────────────────────────────────────────────
  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { setError("이메일과 비밀번호를 입력해주세요."); return; }
    if (password.length < 6) { setError("비밀번호는 6자 이상이어야 해요."); return; }
    setLoading(true); reset();

    if (isSignup) {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${nextUrl}` },
      });
      if (error) setError(error.message === "User already registered" ? "이미 가입된 이메일이에요." : error.message);
      else setSuccess("확인 이메일을 보냈어요. 받은 편지함을 확인해주세요.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });
      if (error) setError("이메일 또는 비밀번호가 올바르지 않아요.");
      else onClose();
    }
    setLoading(false);
  };

  // ── Password Reset ────────────────────────────────────────────────────
  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError("이메일을 입력해주세요."); return; }
    setLoading(true); reset();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) setError(error.message);
    else setSuccess("비밀번호 재설정 이메일을 보냈어요.");
    setLoading(false);
  };

  if (!mounted) return null;

  const BackBtn = ({ to }: { to: View }) => (
    <button type="button"
      onClick={() => { setView(to); reset(); }}
      className="flex items-center gap-1 text-xs text-[var(--text-tertiary)] hover:text-[var(--foreground)] mb-5 transition-all">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      돌아가기
    </button>
  );

  const modal = (
    <div className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 9999, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>

      <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden animate-slide-up"
        style={{ boxShadow: "0 32px 80px rgba(0,0,0,0.25)", maxHeight: "92vh", overflowY: "auto" }}>

        {/* Logo */}
        <div className="px-7 pt-7 pb-4 text-center">
          <div className="w-11 h-11 rounded-2xl overflow-hidden mx-auto mb-3" style={{ aspectRatio: "1/1" }}>
            <Image src="/oprs_logo.jpeg" alt="OR" width={44} height={44} className="w-full h-full object-contain" />
          </div>
          <h2 className="text-base font-bold mb-0.5">OpenResearch 커뮤니티</h2>
          <p className="text-xs text-[var(--text-secondary)]">로그인 후 글 작성·투표·댓글에 참여하세요.</p>
        </div>

        <div className="px-7 pb-7">

          {/* ── Main ── */}
          {view === "main" && (
            <div className="space-y-2.5">
              {/* Google */}
              <button onClick={signInWithGoogle} disabled={googleLoading}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-[var(--border)] hover:bg-[var(--surface)] transition-all disabled:opacity-60 text-sm font-medium">
                {googleLoading
                  ? <div className="w-5 h-5 rounded-full border-2 border-t-[var(--purple)] animate-spin" />
                  : <svg width="20" height="20" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                }
                <span className="flex-1 text-left">Google로 계속하기</span>
              </button>

              {/* Email */}
              <button onClick={() => { setView("email"); reset(); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-[var(--border)] hover:bg-[var(--surface)] transition-all text-sm font-medium text-[var(--text-secondary)]">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.3"/>
                  <path d="M2 7l8 5 8-5" stroke="currentColor" strokeWidth="1.3"/>
                </svg>
                <span className="flex-1 text-left">이메일로 계속하기</span>
              </button>

              <p className="text-center text-[10px] text-[var(--text-tertiary)] pt-1">
                로그인하면 커뮤니티 이용약관에 동의하게 됩니다.
              </p>
            </div>
          )}

          {/* ── Email ── */}
          {view === "email" && (
            <div>
              <BackBtn to="main" />

              {/* Login / Signup toggle */}
              <div className="flex p-1 rounded-xl bg-[var(--surface)] mb-4">
                {([false, true] as const).map(signup => (
                  <button key={String(signup)} type="button"
                    onClick={() => { setIsSignup(signup); reset(); }}
                    className={cn(
                      "flex-1 py-2 text-xs font-semibold rounded-lg transition-all",
                      isSignup === signup ? "bg-white text-[var(--foreground)] shadow-sm" : "text-[var(--text-tertiary)]"
                    )}>
                    {signup ? "회원가입" : "로그인"}
                  </button>
                ))}
              </div>

              {success ? (
                <div className="text-center py-6">
                  <p className="text-3xl mb-3">📬</p>
                  <p className="text-sm font-bold mb-1">이메일을 확인해주세요</p>
                  <p className="text-xs text-[var(--text-tertiary)]">{success}</p>
                  <button onClick={() => setSuccess("")} className="mt-4 text-xs text-[var(--purple)] hover:underline">
                    다시 시도
                  </button>
                </div>
              ) : (
                <form onSubmit={handleEmail} className="space-y-3">
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="이메일" required
                    className="w-full px-4 py-3 text-sm rounded-2xl border border-[var(--border)] outline-none focus:border-[var(--purple-muted)] transition-all" />
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder={isSignup ? "비밀번호 (6자 이상)" : "비밀번호"} required minLength={6}
                    className="w-full px-4 py-3 text-sm rounded-2xl border border-[var(--border)] outline-none focus:border-[var(--purple-muted)] transition-all" />
                  {error && <p className="text-xs text-red-500">{error}</p>}
                  <button type="submit" disabled={loading}
                    className="w-full py-3 text-sm font-semibold text-white rounded-2xl disabled:opacity-60"
                    style={{ background: "linear-gradient(135deg, #474aff, #a54bff)" }}>
                    {loading ? "처리 중..." : isSignup ? "회원가입" : "로그인"}
                  </button>
                  {!isSignup && (
                    <button type="button" onClick={() => { setView("forgot"); reset(); }}
                      className="w-full text-xs text-[var(--text-tertiary)] hover:text-[var(--purple)] transition-all">
                      비밀번호를 잊으셨나요?
                    </button>
                  )}
                </form>
              )}
            </div>
          )}

          {/* ── Forgot password ── */}
          {view === "forgot" && (
            <div>
              <BackBtn to="email" />
              <h3 className="text-sm font-bold mb-1">비밀번호 재설정</h3>
              <p className="text-xs text-[var(--text-secondary)] mb-4">
                가입한 이메일 주소를 입력하면 재설정 링크를 보내드려요.
              </p>
              {success ? (
                <div className="text-center py-4">
                  <p className="text-3xl mb-2">📬</p>
                  <p className="text-sm font-bold mb-1">이메일을 확인해주세요</p>
                  <p className="text-xs text-[var(--text-tertiary)]">{success}</p>
                </div>
              ) : (
                <form onSubmit={sendReset} className="space-y-3">
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="이메일" required
                    className="w-full px-4 py-3 text-sm rounded-2xl border border-[var(--border)] outline-none focus:border-[var(--purple-muted)] transition-all" />
                  {error && <p className="text-xs text-red-500">{error}</p>}
                  <button type="submit" disabled={loading}
                    className="w-full py-3 text-sm font-semibold text-white rounded-2xl disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #474aff, #a54bff)" }}>
                    {loading ? "전송 중..." : "재설정 링크 받기"}
                  </button>
                </form>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
