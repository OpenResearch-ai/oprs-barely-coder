import { NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { moderateContent } from "@/lib/content-moderator";
import { checkBanStatus, banUser } from "@/lib/ban-manager";
import { sendNotification } from "@/lib/telegram";
import { checkRateLimit, formatRetryMessage } from "@/lib/rate-limiter";
import { sendPushToUser } from "@/lib/push-sender";
import { isAdmin, getAuthorName } from "@/lib/admin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: "Login required" }, { status: 401 });
  }

  // Ban check
  const banStatus = await checkBanStatus(user.id);
  if (banStatus.isBanned) {
    const hours = Math.floor((banStatus.remainingMinutes ?? 0) / 60);
    const mins = (banStatus.remainingMinutes ?? 0) % 60;
    return Response.json({
      error: "banned",
      message: `댓글 작성이 제한되었습니다. ${hours}시간 ${mins}분 후에 다시 시도해주세요.`,
    }, { status: 403 });
  }

  // Rate limit
  const rl = await checkRateLimit(`comment:user:${user.id}`, "comment:user");
  if (!rl.allowed) {
    return Response.json({
      error: "rate_limited",
      message: formatRetryMessage(rl.retryAfterMinutes),
    }, { status: 429 });
  }

  const { content, parent_id, image_url } = await req.json();
  if (!content?.trim()) {
    return Response.json({ error: "Content required" }, { status: 400 });
  }

  // Admin: always use "OpenResearch"
  const authorName = getAuthorName(user);
  const db = createServiceClient();

  // Fetch post context for better moderation judgment
  const { data: post } = await db
    .from("posts")
    .select("title, content, post_type")
    .eq("id", postId)
    .single();

  // Moderation — runs for everyone, admin gets softer handling
  const moderation = await moderateContent({
    body: content.trim(),
    author_name: authorName,
    type: "comment",
    imageUrl: image_url?.trim() || undefined,
    postContext: post
      ? `[원글 제목] ${post.title}\n[원글 내용] ${(post.content ?? "").slice(0, 500)}`
      : undefined,
  });

  if (!isAdmin(user.email)) {
    if (moderation.isBannable) {
      await banUser({ userId: user.id, userName: authorName, reason: moderation.reason, violationContent: content.trim() });
    }
    if (moderation.verdict === "REJECT") {
      return Response.json({
        error: "rejected",
        message: moderation.userMessage || "규칙에 맞지 않는 댓글이에요.",
        banned: moderation.isBannable,
      }, { status: 422 });
    }
    if (moderation.verdict === "REVIEW") {
      sendNotification(`👀 *댓글 검토*\n👤 ${authorName}\n💬 "${content.slice(0, 200)}"\n🤖 ${moderation.reason}`).catch(console.error);
    }
  } else if (moderation.verdict === "REJECT") {
    // Admin: still reject on clear violations but no ban
    return Response.json({
      error: "rejected",
      message: moderation.userMessage || "이 내용은 올릴 수 없어요.",
    }, { status: 422 });
  }

  const { data: comment, error } = await db
    .from("comments")
    .insert({
      post_id: postId,
      author_id: user.id,
      author_name: authorName,
      author_avatar: isAdmin(user.email) ? null : (user.user_metadata?.avatar_url ?? null),
      content: content.trim(),
      parent_id: parent_id ?? null,
      image_url: image_url?.trim() || null,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // 웹 푸시 — 글 작성자에게 (본인 댓글 제외, 로그인 유저만)
  if (post?.title) {
    try {
      // 포스트 작성자 ID 조회
      const { data: postData } = await db
        .from("posts")
        .select("author_id")
        .eq("id", postId)
        .single();

      if (postData?.author_id && postData.author_id !== user.id) {
        sendPushToUser(postData.author_id, {
          title: "새 댓글이 달렸어요!",
          body: `${authorName}: ${comment.content.slice(0, 80)}`,
          url: `/posts/${postId}`,
          tag: `comment-${postId}`,
        }).catch(console.error);
      }
    } catch { /* ignore push errors */ }
  }

  return Response.json({ comment }, { status: 201 });
}

// Delete own comment
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params;
  const { searchParams } = new URL(req.url);
  const commentId = searchParams.get("commentId");
  if (!commentId) return Response.json({ error: "commentId required" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Login required" }, { status: 401 });

  const db = createServiceClient();
  const query = isAdmin(user.email)
    ? db.from("comments").delete().eq("id", commentId).eq("post_id", postId)
    : db.from("comments").delete().eq("id", commentId).eq("author_id", user.id);

  const { error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
