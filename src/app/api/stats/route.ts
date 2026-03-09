/**
 * GET /api/stats
 * Vercel Cron: every hour (0 * * * *)
 * Collects stats and sends to Telegram
 */

import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendNotification } from "@/lib/telegram";

export const maxDuration = 30;

async function collectAndReport() {
  const db = createServiceClient();
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const oneDayAgo  = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalPosts },
    { count: newPostsHour },
    { count: newPostsDay },
    { count: totalComments },
    { count: newCommentsHour },
    { count: pendingPosts },
    { count: totalUsers },
  ] = await Promise.all([
    db.from("posts").select("*", { count: "exact", head: true }).eq("status", "active"),
    db.from("posts").select("*", { count: "exact", head: true }).eq("status", "active").gte("created_at", oneHourAgo),
    db.from("posts").select("*", { count: "exact", head: true }).eq("status", "active").gte("created_at", oneDayAgo),
    db.from("comments").select("*", { count: "exact", head: true }),
    db.from("comments").select("*", { count: "exact", head: true }).gte("created_at", oneHourAgo),
    db.from("posts").select("*", { count: "exact", head: true }).eq("status", "pending"),
    db.from("user_bans").select("*", { count: "exact", head: true }), // rough user activity proxy
  ]);

  const hour = now.getHours().toString().padStart(2, "0");
  const msg = [
    `📊 *OpenResearch 시간별 통계* (${hour}:00)`,
    ``,
    `📝 *게시글*`,
    `  전체: ${totalPosts ?? 0}개`,
    `  지난 1시간: +${newPostsHour ?? 0}개`,
    `  지난 24시간: +${newPostsDay ?? 0}개`,
    `  검토 대기: ${pendingPosts ?? 0}개`,
    ``,
    `💬 *댓글*`,
    `  전체: ${totalComments ?? 0}개`,
    `  지난 1시간: +${newCommentsHour ?? 0}개`,
    ``,
    `⏰ ${now.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`,
  ].join("\n");

  await sendNotification(msg);
  return { totalPosts, newPostsHour, newPostsDay, totalComments, newCommentsHour, pendingPosts };
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const stats = await collectAndReport();
  return Response.json({ success: true, stats });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
