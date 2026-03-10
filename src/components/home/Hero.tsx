"use client";

import { useTranslations } from "next-intl";

export default function Hero() {
  const t = useTranslations("hero");

  const titleLines = t("title").split("\n");

  return (
    <section className="relative pt-20 pb-12 px-4 overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 60%, rgba(124, 58, 237, 0.07) 0%, transparent 70%)",
        }}
      />

      <div className="relative max-w-6xl mx-auto">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--purple-light)] text-[var(--purple)] text-xs font-medium mb-6">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--purple)] animate-pulse-glow" />
          {t("badge")}
        </div>

        {/* Title */}
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-4">
          {titleLines.map((line, i) => (
            <span key={i} className="block">
              {i === 0 ? (
                <span
                  style={{
                    background:
                      "linear-gradient(135deg, #0a0a0a 0%, #7c3aed 80%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {line}
                </span>
              ) : (
                line
              )}
            </span>
          ))}
        </h1>

        {/* Subtitle */}
        <p className="text-lg md:text-xl font-medium text-[var(--text-secondary)] mb-3 max-w-xl">
          {t("subtitle")}
        </p>

        <p className="text-sm md:text-base text-[var(--text-tertiary)] max-w-lg leading-relaxed mb-8">
          {t("description")}
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="/community"
            className="px-5 py-2.5 bg-[var(--purple)] text-white text-sm font-medium rounded-full hover:bg-purple-700 transition-all hover:shadow-lg hover:shadow-purple-200"
          >
            {t("cta_community")}
          </a>
          <a
            href="/products"
            className="px-5 py-2.5 bg-[var(--surface)] border border-[var(--border)] text-sm font-medium rounded-full hover:border-[var(--purple-muted)] transition-all"
          >
            {t("cta_products")}
          </a>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap items-center gap-6 mt-10 pt-10 border-t border-[var(--border-light)]">
          {[
            { value: "3", label: "Products" },
            { value: "0", label: "Full-time devs" },
            { value: "∞", label: "Agents working" },
            { value: "open", label: "To everyone" },
          ].map(({ value, label }) => (
            <div key={label} className="flex flex-col">
              <span className="text-2xl font-bold text-[var(--foreground)]">
                {value}
              </span>
              <span className="text-xs text-[var(--text-tertiary)]">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
