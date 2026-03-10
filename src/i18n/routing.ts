import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ko", "en", "ja", "zh", "es"],
  defaultLocale: "ko",  // 항상 한글 기본
  localePrefix: "never",
});

export type Locale = (typeof routing.locales)[number];
