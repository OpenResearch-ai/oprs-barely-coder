import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendNotification } from "@/lib/telegram";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/ko";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const createdAt = new Date(user.created_at).getTime();
        const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : createdAt;
        const isNewUser = Math.abs(lastSignIn - createdAt) < 10_000; // 10초 이내면 신규
        if (isNewUser) {
          const email = user.email || "(이메일 없음)";
          const name = user.user_metadata?.full_name || user.user_metadata?.name || null;
          const provider = user.app_metadata?.provider || "unknown";
          sendNotification(
            `🎉 새 회원 가입!\n\n` +
            `📧 ${email}` + (name ? `\n👤 ${name}` : "") + `\n` +
            `🔑 ${provider}`
          ).catch(console.error);
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/ko?error=auth`);
}
