import createMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { routing } from "./src/i18n/routing";
import { NextRequest, NextResponse } from "next/server";

const DEFAULT = routing.defaultLocale;
const handleI18n = createMiddleware(routing);

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // auth 경로는 intl 미들웨어에서 제외
  if (pathname.startsWith("/auth")) {
    return NextResponse.next();
  }

  // root → /ko 리다이렉트
  if (pathname === "/") {
    return NextResponse.redirect(new URL(`/${DEFAULT}`, req.url));
  }

  // Supabase 세션 갱신 (access token 만료 방지)
  const res = handleI18n(req);
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookies) => cookies.forEach(({ name, value, options }) =>
          (res as NextResponse).cookies.set(name, value, options)
        ),
      },
    }
  );
  await supabase.auth.getUser();

  return res;
}

export const config = {
  matcher: ["/((?!api|auth|_next|_vercel|.*\\..*).*)"],
};
