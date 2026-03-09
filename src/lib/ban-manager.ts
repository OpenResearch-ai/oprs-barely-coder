import { createServiceClient } from "@/lib/supabase/server";
import { sendNotification } from "@/lib/telegram";

const BAN_HOURS = 24;

export interface BanStatus {
  isBanned: boolean;
  bannedUntil?: Date;
  banCount?: number;
  remainingMinutes?: number;
}

export async function checkBanStatus(userId: string): Promise<BanStatus> {
  const db = createServiceClient();
  const { data } = await db
    .from("user_bans")
    .select("banned_until, ban_count")
    .eq("user_id", userId)
    .single();

  if (!data) return { isBanned: false };

  const bannedUntil = new Date(data.banned_until);
  if (bannedUntil <= new Date()) {
    return { isBanned: false }; // ban expired
  }

  const remainingMs = bannedUntil.getTime() - Date.now();
  const remainingMinutes = Math.ceil(remainingMs / 60000);

  return {
    isBanned: true,
    bannedUntil,
    banCount: data.ban_count,
    remainingMinutes,
  };
}

export async function banUser(params: {
  userId: string;
  userName: string;
  reason: string;
  violationContent: string;
}): Promise<void> {
  const db = createServiceClient();
  const bannedUntil = new Date(Date.now() + BAN_HOURS * 60 * 60 * 1000);

  // Upsert: if already banned, increment count and extend
  const { data: existing } = await db
    .from("user_bans")
    .select("ban_count")
    .eq("user_id", params.userId)
    .single();

  const banCount = (existing?.ban_count ?? 0) + 1;

  await db.from("user_bans").upsert({
    user_id: params.userId,
    reason: params.reason,
    violation_content: params.violationContent.slice(0, 500),
    banned_until: bannedUntil.toISOString(),
    ban_count: banCount,
  }, { onConflict: "user_id" });

  // Notify admin via Telegram
  const repeatNote = banCount > 1 ? ` (${banCount}번째 위반)` : "";
  await sendNotification(
    `🚫 *유저 차단${repeatNote}*\n\n` +
    `👤 ${params.userName}\n` +
    `⏰ ${BAN_HOURS}시간 차단\n` +
    `📌 사유: ${params.reason}\n\n` +
    `위반 내용:\n_${params.violationContent.slice(0, 200)}_`
  ).catch(console.error);
}
