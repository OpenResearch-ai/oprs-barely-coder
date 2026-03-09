/**
 * GET /api/stats
 * Vercel Cron: every hour (0 * * * *)
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
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalPosts },
    { count: newPostsHour },
    { count: newPostsDay },
    { count: totalComments },
    { count: newCommentsHour },
    { count: pendingPosts },
    { count: totalVotes },
    { count: newVotesDay },
    // 신규 가입자 (auth.users via user_bans proxy — 직접 조회)
    { data: recentUsers },
    { count: totalBans },
  ] = await Promise.all([
    db.from("posts").select("*", { count: "exact", head: true }).eq("status", "active"),
    db.from("posts").select("*", { count: "exact", head: true }).eq("status", "active").gte("created_at", oneHourAgo),
    db.from("posts").select("*", { count: "exact", head: true }).eq("status", "active").gte("created_at", oneDayAgo),
    db.from("comments").select("*", { count: "exact", head: true }),
    db.from("comments").select("*", { count: "exact", head: true }).gte("created_at", oneHourAgo),
    db.from("posts").select("*", { count: "exact", head: true }).eq("status", "pending"),
    db.from("votes").select("*", { count: "exact", head: true }),
    db.from("votes").select("*", { count: "exact", head: true }).gte("created_at", oneDayAgo),
    // push_subscriptions = 알림 허용한 유저 (활성 유저 프록시)
    db.from("push_subscriptions").select("created_at").gte("created_at", oneWeekAgo),
    db.from("user_bans").select("*", { count: "exact", head: true }),
  ]);

  const newUsersWeek = recentUsers?.length ?? 0;
  const hour = now.getHours().toString().padStart(2, "0");
  const dateStr = now.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric" });

  const msg = [
    `📊 *OpenResearch 통계* (${dateStr} ${hour}시)`,
    ``,
    `👥 *커뮤니티 활동*`,
    `  글 전체: ${totalPosts ?? 0}개  |  오늘: +${newPostsDay ?? 0}  |  1시간: +${newPostsHour ?? 0}`,
    `  댓글: ${totalComments ?? 0}개  |  1시간: +${newCommentsHour ?? 0}`,
    `  추천: ${totalVotes ?? 0}개  |  오늘: +${newVotesDay ?? 0}`,
    `  검토 대기: ${pendingPosts ?? 0}개`,
    ``,
    `📲 *알림 구독* (주간 신규)`,
    `  이번 주 새 알림 허용: ${newUsersWeek}명`,
    ``,
    `🚫 *누적 밴*: ${totalBans ?? 0}건`,
    ``,
    `🔗 openresearch.ai`,
  ].join("\n");

  await sendNotification(msg);
  return { totalPosts, newPostsHour, totalComments, pendingPosts };
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
