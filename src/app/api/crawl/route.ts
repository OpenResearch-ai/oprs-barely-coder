/**
 * POST/GET /api/crawl
 * Vercel Cron: every 30 min
 *
 * Crawls HN, Reddit, GeekNews → sends to Telegram for confirmation
 * Admin confirms/edits/skips via Telegram inline buttons
 */

import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendNotification } from "@/lib/telegram";

export const maxDuration = 120;

const BOT = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID!;

interface CrawledItem {
  title: string;
  url: string;
  source: string;
  score?: number;
}

async function fetchHN(): Promise<CrawledItem[]> {
  const res = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json", {
    signal: AbortSignal.timeout(8000),
  });
  const ids: number[] = await res.json();
  const AI = /ai|llm|gpt|claude|gemini|machine learning|vibe cod|cursor|openai|anthropic|agent|copilot/i;
  const items = await Promise.allSettled(
    ids.slice(0, 40).map(id =>
      fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(r => r.json())
    )
  );
  return items
    .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled" && r.value?.url && AI.test(r.value.title))
    .map(r => ({ title: r.value.title, url: r.value.url, source: "HackerNews", score: r.value.score }))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 3);
}

async function fetchReddit(): Promise<CrawledItem[]> {
  const res = await fetch("https://www.reddit.com/r/artificial/top.json?t=day&limit=15", {
    headers: { "User-Agent": "OpenResearch-Bot/1.0" },
    signal: AbortSignal.timeout(8000),
  });
  const data = await res.json();
  return (data?.data?.children ?? [])
    .filter((p: any) => !p.data.url.includes("reddit.com"))
    .map((p: any) => ({ title: p.data.title, url: p.data.url, source: "Reddit", score: p.data.score }))
    .slice(0, 2);
}

async function fetchGeekNews(): Promise<CrawledItem[]> {
  const res = await fetch("https://feeds.feedburner.com/GeekNews", {
    signal: AbortSignal.timeout(8000),
  });
  const xml = await res.text();
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
  return items.slice(0, 3).map(([, c]) => ({
    title: (c.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ?? c.match(/<title>(.*?)<\/title>/)?.[1] ?? "").trim(),
    url: (c.match(/<link>(.*?)<\/link>/)?.[1] ?? "").trim(),
    source: "GeekNews",
  })).filter(i => i.title && i.url);
}

// Send single item to Telegram for review
async function sendForReview(item: CrawledItem) {
  const text = `📡 *${item.source}*\n\n` +
    `*${escapeMarkdown(item.title)}*\n` +
    `${item.url}` +
    (item.score ? `\n스코어: ${item.score}` : "");

  await fetch(`${BOT}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text,
      parse_mode: "Markdown",
      disable_web_page_preview: false,
      reply_markup: {
        inline_keyboard: [[
          { text: "✅ 게시", callback_data: `crawl_post:${encodeURIComponent(item.url)}` },
          { text: "✏️ 수정 후 게시", callback_data: `crawl_edit:${encodeURIComponent(item.url)}` },
          { text: "❌ 건너뛰기", callback_data: `crawl_skip:${encodeURIComponent(item.url)}` },
        ]],
      },
    }),
  });
}

function escapeMarkdown(t: string) {
  return t.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, "\\$1");
}

async function runCrawl() {
  const db = createServiceClient();

  // Get recently posted URLs (last 48h) to avoid duplicates
  const { data: recent } = await db
    .from("posts")
    .select("source_url")
    .not("source_url", "is", null)
    .gte("created_at", new Date(Date.now() - 48 * 3600000).toISOString());

  const posted = new Set(recent?.map(p => p.source_url) ?? []);

  const [hn, reddit, gk] = await Promise.allSettled([
    fetchHN().catch(() => [] as CrawledItem[]),
    fetchReddit().catch(() => [] as CrawledItem[]),
    fetchGeekNews().catch(() => [] as CrawledItem[]),
  ]);

  const all: CrawledItem[] = [
    ...(hn.status === "fulfilled" ? hn.value : []),
    ...(reddit.status === "fulfilled" ? reddit.value : []),
    ...(gk.status === "fulfilled" ? gk.value : []),
  ].filter(item => item.url && !posted.has(item.url));

  if (all.length === 0) return { sent: 0 };

  // Send each item to Telegram for review (with delay)
  let sent = 0;
  for (const item of all) {
    try {
      await sendForReview(item);
      sent++;
      await new Promise(r => setTimeout(r, 800));
    } catch { /* ignore */ }
  }

  return { sent, total: all.length };
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runCrawl();
    return Response.json({ success: true, ...result });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
