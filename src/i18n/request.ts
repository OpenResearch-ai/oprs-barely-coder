import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

// Explicit imports — template literal dynamic imports don't work with Turbopack
import ko from "../../messages/ko.json";
import en from "../../messages/en.json";
import ja from "../../messages/ja.json";
import zh from "../../messages/zh.json";
import es from "../../messages/es.json";

const messages: Record<string, object> = { ko, en, ja, zh, es };

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as (typeof routing.locales)[number])) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: messages[locale] ?? ko,
  };
});
