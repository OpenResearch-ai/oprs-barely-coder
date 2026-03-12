import { NextRequest } from "next/server";
import { sendNotification } from "@/lib/telegram";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-webhook-secret");
  if (secret !== process.env.CRON_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  // Supabase Auth webhook: type = "signup"
  if (body.type !== "signup") {
    return Response.json({ ok: true });
  }

  const user = body.record ?? body.user ?? {};
  const email = user.email || "(이메일 없음)";
  const name = user.raw_user_meta_data?.full_name || user.raw_user_meta_data?.name || null;
  const provider = user.raw_app_meta_data?.provider || "unknown";
  const createdAt = (user.created_at || "").slice(0, 10);

  await sendNotification(
    `🎉 새 회원 가입!\n\n` +
    `📧 ${email}` + (name ? `\n👤 ${name}` : "") + `\n` +
    `🔑 ${provider}  |  📅 ${createdAt}`
  );

  return Response.json({ ok: true });
}
