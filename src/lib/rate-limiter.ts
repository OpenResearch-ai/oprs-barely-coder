import { createServiceClient } from "@/lib/supabase/server";

interface RateLimitConfig {
  windowMs: number;   // window size in ms
  max: number;        // max requests per window
}

const LIMITS: Record<string, RateLimitConfig> = {
  "chat:anon":      { windowMs: 60 * 60 * 1000, max: 5   },  // 5/hour (anonymous)
  "chat:user":      { windowMs: 60 * 60 * 1000, max: 60  },  // 60/hour (logged in)
  "post:user":      { windowMs: 10 * 60 * 1000, max: 5   },  // 5 posts/10min
  "comment:user":   { windowMs: 10 * 60 * 1000, max: 10  },  // 10 comments/10min
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfterMinutes: number;
}

export async function checkRateLimit(
  key: string,           // e.g. "chat:anon:ip123" or "post:user:user-id"
  limitType: keyof typeof LIMITS
): Promise<RateLimitResult> {
  const config = LIMITS[limitType];
  const db = createServiceClient();
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowMs);

  // Get or create rate limit record
  const { data: existing } = await db
    .from("rate_limits")
    .select("requests, window_start")
    .eq("id", key)
    .single();

  const resetAt = new Date(now.getTime() + config.windowMs);

  if (!existing || new Date(existing.window_start) < windowStart) {
    // New window — reset counter
    await db.from("rate_limits").upsert({
      id: key,
      requests: 1,
      window_start: now.toISOString(),
      updated_at: now.toISOString(),
    });
    return { allowed: true, remaining: config.max - 1, resetAt, retryAfterMinutes: 0 };
  }

  const currentCount = existing.requests;
  const windowResetAt = new Date(new Date(existing.window_start).getTime() + config.windowMs);

  if (currentCount >= config.max) {
    const retryAfterMs = windowResetAt.getTime() - now.getTime();
    const retryAfterMinutes = Math.ceil(retryAfterMs / 60000);
    return { allowed: false, remaining: 0, resetAt: windowResetAt, retryAfterMinutes };
  }

  // Increment
  await db.from("rate_limits").update({
    requests: currentCount + 1,
    updated_at: now.toISOString(),
  }).eq("id", key);

  return { allowed: true, remaining: config.max - currentCount - 1, resetAt: windowResetAt, retryAfterMinutes: 0 };
}

export function formatRetryMessage(minutes: number, locale = "ko"): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const timeStr = hours > 0
    ? `${hours}시간${mins > 0 ? ` ${mins}분` : ""}`
    : `${mins}분`;

  if (locale === "ko") return `요청 한도에 도달했어요. ${timeStr} 후에 다시 시도해주세요.`;
  if (locale === "ja") return `リクエスト制限に達しました。${timeStr}後に再試行してください。`;
  if (locale === "zh") return `已达到请求限制。请${timeStr}后再试。`;
  return `Rate limit reached. Please try again in ${timeStr}.`;
}
