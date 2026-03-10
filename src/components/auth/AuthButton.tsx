"use client";

import { useState } from "react";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { isAdmin } from "@/lib/admin";
import LoginModal from "./LoginModal";

export default function AuthButton() {
  const { user, loading, signOut } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  if (loading) {
    return <div className="w-7 h-7 rounded-full bg-[var(--surface)] animate-pulse shrink-0" />;
  }

  if (!user) {
    return (
      <>
        <button
          onClick={() => setShowLogin(true)}
          className="px-4 py-1.5 text-xs font-semibold text-white rounded-full transition-all hover:opacity-90 shrink-0"
          style={{ background: "linear-gradient(135deg, #474aff, #a54bff)" }}
        >
          로그인
        </button>
        {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      </>
    );
  }

  const admin = isAdmin(user.email);
  const avatar = admin ? "/oprs_logo.jpeg" : user.user_metadata?.avatar_url;
  const name = admin
    ? "OpenResearch"
    : (user.user_metadata?.name ?? user.user_metadata?.user_name ?? user.email?.split("@")[0] ?? "User");
  const initial = name[0]?.toUpperCase();

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setShowMenu(v => !v)}
        className="flex items-center gap-2 hover:opacity-80 transition-all"
      >
        {avatar ? (
          <div className="w-7 h-7 rounded-full overflow-hidden border border-[var(--border)]" style={{ aspectRatio: "1/1" }}>
            <Image src={avatar} alt={name} width={28} height={28}
              className="w-full h-full object-cover" unoptimized />
          </div>
        ) : (
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ background: "linear-gradient(135deg, #474aff, #a54bff)" }}>
            {initial}
          </div>
        )}
        <span className="hidden md:block text-xs font-medium text-[var(--foreground)] max-w-[72px] truncate">
          {name}
        </span>
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-10 z-50 w-48 rounded-2xl overflow-hidden py-1"
            style={{ background: "white", border: "1px solid var(--border)", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}>

            <div className="px-3 py-2.5 border-b border-[var(--border-light)]">
              <p className="text-xs font-semibold truncate">{name}</p>
              <p className="text-[10px] text-[var(--text-tertiary)] truncate">{user.email}</p>
              {admin && (
                <span className="text-[9px] font-bold text-[var(--purple)]">관리자</span>
              )}
            </div>

            <a href="/profile"
              onClick={() => setShowMenu(false)}
              className="flex items-center gap-2 px-3 py-2 text-xs text-[var(--foreground)] hover:bg-[var(--surface)] transition-all">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <circle cx="6.5" cy="4" r="2.5" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M1.5 11c0-2.76 2.239-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              프로필 설정
            </a>

            <button
              onClick={() => { signOut(); setShowMenu(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition-all">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M5 11H2.5a1 1 0 01-1-1V3a1 1 0 011-1H5M9 9l3-3-3-3M12 6.5H5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              로그아웃
            </button>
          </div>
        </>
      )}
    </div>
  );
}
