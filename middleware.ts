import createMiddleware from "next-intl/middleware";
import { routing } from "./src/i18n/routing";
import { NextRequest, NextResponse } from "next/server";

const SUPPORTED = routing.locales as readonly string[];
const DEFAULT = routing.defaultLocale;
const COOKIE = "NEXT_LOCALE";

const handleI18n = createMiddleware(routing);

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only handle root redirect for locale detection
  if (pathname === "/") {
    // 항상 한글(ko)로 랜딩 — 다국어 준비 중
    return NextResponse.redirect(new URL(`/${DEFAULT}`, req.url));
  }

  return handleI18n(req);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
