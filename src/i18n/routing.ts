import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "ko", "ja", "zh", "es"],
  defaultLocale: "ko",  // 항상 한글 기본
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];
