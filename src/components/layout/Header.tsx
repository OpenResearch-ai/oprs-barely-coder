"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useState, useEffect } from "react";
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
  useEffect(() => setMounted(true), []);

  const switchLocale = (newLocale: Locale) => {
    if (newLocale !== "ko") {
      setComingSoonLang(newLocale);
      return;
    }
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    const segments = pathname.split("/");
    segments[1] = newLocale;
    window.location.href = segments.join("/") || `/${newLocale}`;
  };

  const NAV = [
    { key: "community",       label: t("community"),       href: `/${locale}` },
    { key: "products_sprint", label: t("products_sprint"), href: `/${locale}/products` },
    // 소개 페이지 임시 비활성화
    // { key: "about",        label: t("about"),           href: `/${locale}/about` },
  ];

  const isActive = (href: string) => {
    if (href === `/${locale}`) return pathname === href || pathname.startsWith(`/${locale}/community`);
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
        <a href={`/${locale}`} className="flex items-center gap-2 shrink-0">
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

        {/* Mobile: current page name */}
        <div className="md:hidden flex-1 min-w-0">
          <span className="text-sm font-semibold truncate">
            {NAV.find(n => isActive(n.href))?.label ?? t("community")}
          </span>
        </div>

        <div className="flex-1 hidden md:block" />

        {/* Auth */}
        <AuthButton />
        <div className="w-px h-4 bg-[var(--border)] shrink-0 hidden sm:block" />

        {/* Language switcher */}
        <div className="flex items-center gap-0.5 shrink-0">
          {routing.locales.map((loc) => (
            <button key={loc} onClick={() => switchLocale(loc)}
              className={cn(
                "px-2 py-1 text-xs rounded-full transition-all",
                locale === loc
                  ? "bg-[var(--foreground)] text-white font-medium"
                  : "text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--surface)]"
              )}>
              {LOCALE_LABELS[loc]}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile bottom tab */}
      <div className="md:hidden flex border-t border-[var(--border-light)]">
        {NAV.map(({ key, label, href }) => (
          <a key={key} href={href}
            className={cn(
              "flex-1 py-2 text-center text-xs transition-all",
              isActive(href)
                ? "text-[var(--purple)] font-semibold border-b-2 border-[var(--purple)]"
                : "text-[var(--text-tertiary)]"
            )}>
            {label}
          </a>
        ))}
      </div>
    </header>
    </>
  );
}
