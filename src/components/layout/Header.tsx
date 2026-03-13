"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { routing, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import AuthButton from "@/components/auth/AuthButton";

// "준비 중" 메시지 — 한글 + 해당 언어
const COMING_SOON: Record<Locale, string> = {
  ko: "",
  en: "Coming soon.\nWe'll support it shortly!",
  ja: "準備中です。\nもうすぐ対応します！",
  zh: "即将推出，\n敬请期待！",
  es: "¡Próximamente!\nLo soportaremos pronto.",
};

const LOCALE_LABELS: Record<Locale, string> = {
  ko: "한글",
  en: "ENG",
  ja: "日本語",
  zh: "中文",
  es: "ESP",
};

export default function Header() {
  const t = useTranslations("nav");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const [comingSoonLang, setComingSoonLang] = useState<Locale | null>(null);
  const [mounted, setMounted] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const switchLocale = (newLocale: Locale) => {
    if (newLocale !== "ko" && newLocale !== "en") {
      setComingSoonLang(newLocale);
      return;
    }
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    // Save preference to DB (best-effort, don't block)
    fetch("/api/user/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        preferred_locale: newLocale,
        auto_locale: navigator.language.split("-")[0],
      }),
    }).catch(() => {});
    window.location.reload();
  };

  const NAV = [
    { key: "community",       label: t("community"),       href: "/" },
    { key: "products_sprint", label: t("products_sprint"), href: "/products" },
    // 소개 페이지 임시 비활성화
    // { key: "about",        label: t("about"),           href: "/about" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/" || pathname.startsWith("/community");
    return pathname.startsWith(href);
  };

  const popup = comingSoonLang && mounted && createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)" }}
      onClick={() => setComingSoonLang(null)}
    >
      <div
        className="animate-slide-up text-center"
        style={{
          width: 260,
          background: "white",
          borderRadius: 24,
          padding: "28px 24px 24px",
          boxShadow: "0 32px 64px rgba(0,0,0,0.2), 0 4px 16px rgba(0,0,0,0.08)",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: 36, lineHeight: 1, marginBottom: 12 }}>🌏</div>

        {/* 한글 */}
        <p style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", marginBottom: 2 }}>
          준비 중입니다.
        </p>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 14 }}>
          곧 지원할게요!
        </p>

        {/* 구분선 */}
        <div style={{ height: 1, background: "var(--border-light)", marginBottom: 14 }} />

        {/* 해당 언어 */}
        {COMING_SOON[comingSoonLang].split("\n").map((line, i) => (
          <p key={i} style={{
            fontSize: i === 0 ? 14 : 12,
            fontWeight: i === 0 ? 700 : 400,
            color: "var(--purple)",
            opacity: i === 0 ? 1 : 0.75,
            marginBottom: 2,
          }}>
            {line}
          </p>
        ))}

        <button
          onClick={() => setComingSoonLang(null)}
          style={{
            marginTop: 18,
            padding: "8px 28px",
            fontSize: 13,
            fontWeight: 600,
            color: "white",
            background: "linear-gradient(135deg, #474aff, #a54bff)",
            border: "none",
            borderRadius: 999,
            cursor: "pointer",
          }}
        >
          확인 / OK
        </button>
      </div>
    </div>,
    document.body
  );

  return (
    <>
    {popup}
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-[var(--border-light)]">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">

        {/* Logo */}
        <a href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-full overflow-hidden" style={{ aspectRatio: "1/1" }}>
            <Image src="/oprs_logo.jpeg" alt="OpenResearch" width={28} height={28}
              className="w-full h-full object-contain" />
          </div>
          <span className="text-sm font-semibold hidden sm:block">OpenResearch</span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-0.5 ml-2">
          {NAV.map(({ key, label, href }) => (
            <a key={key} href={href}
              className={cn(
                "px-3 py-1.5 text-sm rounded-lg transition-all flex items-center gap-1",
                isActive(href)
                  ? "text-[var(--foreground)] font-semibold bg-[var(--surface)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--surface)]"
              )}>
              {label}
              {isActive(href) && <span className="w-1 h-1 rounded-full bg-[var(--purple)] inline-block" />}
            </a>
          ))}
        </nav>

        {/* Mobile nav — inline in header */}
        <nav className="md:hidden flex items-center gap-0.5 flex-1 min-w-0">
          {NAV.map(({ key, label, href }) => (
            <a key={key} href={href}
              className={cn(
                "px-2.5 py-1 text-xs rounded-lg transition-all truncate",
                isActive(href)
                  ? "text-[var(--foreground)] font-semibold bg-[var(--surface)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--foreground)]"
              )}>
              {label}
            </a>
          ))}
        </nav>

        <div className="flex-1 hidden md:block" />

        {/* Auth */}
        <AuthButton />
        <div className="w-px h-4 bg-[var(--border)] shrink-0 hidden sm:block" />

        {/* Language switcher */}
        <div className="relative shrink-0" ref={langRef}>
          <button
            onClick={() => setLangOpen(v => !v)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-all">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M6.5 1C6.5 1 4.5 3.5 4.5 6.5s2 5.5 2 5.5M6.5 1c0 0 2 2.5 2 5.5s-2 5.5-2 5.5M1 6.5h11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            {LOCALE_LABELS[locale]}
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={cn("transition-transform", langOpen && "rotate-180")}>
              <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {langOpen && (
            <div className="absolute right-0 top-full mt-1 w-32 rounded-xl border border-[var(--border-light)] bg-white shadow-lg overflow-hidden z-50">
              {routing.locales.map((loc) => (
                <button key={loc} onClick={() => { switchLocale(loc); setLangOpen(false); }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-xs transition-colors",
                    locale === loc
                      ? "font-semibold text-[var(--purple)] bg-[var(--purple-light)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface)]"
                  )}>
                  {LOCALE_LABELS[loc]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

    </header>
    </>
  );
}
