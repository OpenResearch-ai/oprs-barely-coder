import { NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { moderateContent } from "@/lib/content-moderator";
import { checkBanStatus, banUser } from "@/lib/ban-manager";
import { sendModerationRequest } from "@/lib/telegram";
import { isAdmin, getAuthorName } from "@/lib/admin";
import { checkRateLimit, formatRetryMessage } from "@/lib/rate-limiter";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);

  const postType = searchParams.get("type");
  const product = searchParams.get("product");
  const author = searchParams.get("author");
  const sort = searchParams.get("sort") ?? "new";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);
  const offset = parseInt(searchParams.get("offset") ?? "0");

  let query = supabase.from("posts").select("*").eq("status", "active");

  if (postType && postType !== "all") query = query.eq("post_type", postType);
  if (product) query = query.eq("product", product);
  if (author) query = query.eq("author_name", author);

  if (sort === "new") {
    query = query.order("created_at", { ascending: false });
  } else if (sort === "top") {
    query = query.order("upvote_count", { ascending: false });
  } else {
    query = query.order("upvote_count", { ascending: false })
                 .order("created_at", { ascending: false });
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ posts: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Login required" }, { status: 401 });
  }

  // ── Ban check ───────────────────────────────────────
  const banStatus = await checkBanStatus(user.id);
  if (banStatus.isBanned) {
    const hours = Math.floor((banStatus.remainingMinutes ?? 0) / 60);
    const mins = (banStatus.remainingMinutes ?? 0) % 60;
    return Response.json({
      error: "banned",
      message: `커뮤니티 이용이 일시 제한되었습니다. ${hours}시간 ${mins}분 후에 다시 시도해주세요.`,
    }, { status: 403 });
  }

  const body = await req.json();
  const { title, content, post_type, product, locale, source_url, image_url } = body;

  if (!title?.trim()) {
    return Response.json({ error: "Title is required" }, { status: 400 });
  }

  const authorName = getAuthorName(user);
  const admin = isAdmin(user.email);
  // Admin posts skip moderation and are immediately active


  // ── Rate limit (skip for admin) ─────────────────────
  if (!isAdmin(user.email)) {
    const rl = await checkRateLimit(`post:user:${user.id}`, "post:user");
    if (!rl.allowed) {
      return Response.json({
        error: "rate_limited",
        message: formatRetryMessage(rl.retryAfterMinutes),
      }, { status: 429 });
    }
  }

  // ── AI Moderation — runs for everyone including admin ──
  const moderation = await moderateContent({
    title: title.trim(),
    body: content?.trim() ?? "",
    author_name: authorName,
    type: "post",
    category: post_type,
    sourceUrl: source_url?.trim() || undefined,
    imageUrl: image_url?.trim() || undefined,
  });

  // Ban if needed
  if (moderation.isBannable) {
    await banUser({
      userId: user.id,
      userName: authorName,
      reason: moderation.reason,
      violationContent: `[제목] ${title}\n[내용] ${content ?? ""}`,
    });
  }

  if (moderation.verdict === "REJECT") {
    return Response.json({
      error: "rejected",
      message: moderation.userMessage || "커뮤니티 규칙에 맞지 않는 내용이에요.",
      banned: moderation.isBannable,
    }, { status: 422 });
  }

  // Admin posts: always active if PASS/REVIEW; author name is "OpenResearch"
  const status = (moderation.verdict === "PASS" || (admin && moderation.verdict === "REVIEW"))
    ? "active" : "pending";

  // ── Save post ───────────────────────────────────────
  const db = createServiceClient();
  const { data: post, error } = await db
    .from("posts")
    .insert({
      title: title.trim(),
      content: content?.trim() ?? null,
      author_id: user.id,
      author_name: authorName,
      author_avatar: user.user_metadata?.avatar_url ?? null,
      post_type: post_type ?? "community",
      product: product ?? null,
      tags: [],
      locale: locale ?? "ko",
      source_url: source_url?.trim() || null,
      image_url: image_url?.trim() || null,
      status,
      ai_moderation_result: moderation,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // ── Telegram review request ─────────────────────────
  if (status === "pending" && post) {
    sendModerationRequest({
      id: post.id,
      title: post.title,
      content: post.content,
      post_type: post.post_type,
      product: post.product,
      author_name: post.author_name,
      ai_reason: moderation.reason,
    }).catch(console.error);
  }

  return Response.json({
    post,
    status,
    message: status === "pending"
      ? "검토 후 게시됩니다. 보통 몇 분 내에 처리돼요."
      : "게시되었습니다!",
  }, { status: 201 });
}
