"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { routing, type Locale } from "@/i18n/routing";

const SESSION_KEY = "or-locale-synced";

function getCookieLocale(): string {
  const match = document.cookie.match(/NEXT_LOCALE=([^;]+)/);
  return match?.[1] ?? "ko";
}

function setLocaleCookie(locale: string) {
  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; SameSite=Lax`;
}

export default function LocaleSync() {
  const currentLocale = useLocale();

  useEffect(() => {
    // Run once per session
    if (sessionStorage.getItem(SESSION_KEY)) return;

    const sync = async () => {
      const autoLocale = navigator.language.split("-")[0];

      // Fetch stored preference from DB
      const res = await fetch("/api/user/locale");
      if (!res.ok) return; // not logged in

      const stored = await res.json();

      // If stored preferred_locale differs from current → apply it (syncs across devices)
      const storedLocale = stored.preferred_locale as Locale | undefined;
      if (
        storedLocale &&
        storedLocale !== currentLocale &&
        routing.locales.includes(storedLocale)
      ) {
        setLocaleCookie(storedLocale);
        sessionStorage.setItem(SESSION_KEY, "1");
        window.location.reload();
        return;
      }

      // Save current locale + auto-detected language to DB
      await fetch("/api/user/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferred_locale: currentLocale,
          auto_locale: routing.locales.includes(autoLocale as Locale) ? autoLocale : "ko",
        }),
      });

      sessionStorage.setItem(SESSION_KEY, "1");
    };

    sync().catch(() => {});
  }, []);

  return null;
}
