import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { answerCallbackQuery, editMessageReplyMarkup, sendNotification } from "@/lib/telegram";
import { createBotPost } from "@/lib/bot-poster";

// Track pending edits: messageId → url waiting for edit text
const pendingEdits = new Map<number, string>();

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  // ── Inline button callbacks ────────────────────────────────────────
  if (body.callback_query) {
    const { id, data, message, from } = body.callback_query;
    const colonIdx = (data as string).indexOf(":");
    const action = (data as string).slice(0, colonIdx);
    const payload = (data as string).slice(colonIdx + 1);

    const db = createServiceClient();

    // ── Moderation: approve / reject ──
    if (action === "approve" || action === "reject") {
      const postId = payload;
      const status = action === "approve" ? "active" : "rejected";
      await db.from("posts").update({ status }).eq("id", postId).eq("status", "pending");
      await answerCallbackQuery(id, action === "approve" ? "✅ 승인" : "❌ 거절");
      await editMessageReplyMarkup(
        message.chat.id, message.message_id,
        `${message.text}\n\n${action === "approve" ? "✅" : "❌"} *${from.first_name}님이 처리했습니다*`
      );
    }

    // ── Crawl: post immediately ──
    else if (action === "crawl_post") {
      const url = decodeURIComponent(payload);
      await answerCallbackQuery(id, "AI가 작성 중...");
      const result = await createBotPost({ url });
      if (result.success) {
        await editMessageReplyMarkup(
          message.chat.id, message.message_id,
          `${message.text}\n\n✅ *게시 완료*\n📝 ${result.title}`
        );
      } else {
        await sendNotification(`❌ 게시 실패: ${result.error}`);
      }
    }

    // ── Crawl: request edit ──
    else if (action === "crawl_edit") {
      const url = decodeURIComponent(payload);
      pendingEdits.set(message.message_id, url);
      await answerCallbackQuery(id, "수정 내용을 보내주세요");
      await sendNotification(
        `✏️ 수정 내용을 메시지로 보내주세요.\n` +
        `형식:\n제목: [새 제목]\n내용: [새 내용]\n\n` +
        `또는 "건너뛰기"라고 보내면 취소됩니다.`
      );
      // Store the edit context
      await db.from("sync_logs").insert({
        started_at: new Date().toISOString(),
        status: "error",
        error_message: `EDIT_PENDING:${url}:${message.message_id}`,
      });
    }

    // ── Crawl: skip ──
    else if (action === "crawl_skip") {
      await answerCallbackQuery(id, "건너뜀");
      await editMessageReplyMarkup(
        message.chat.id, message.message_id,
        `${message.text}\n\n⏭️ *건너뜀*`
      );
    }

    return Response.json({ ok: true });
  }

  // ── Text messages ──────────────────────────────────────────────────
  if (body.message?.text) {
    const text: string = body.message.text.trim();
    const chatId: number = body.message.chat.id;

    // Only from owner
    if (chatId !== parseInt(process.env.TELEGRAM_CHAT_ID!)) {
      return Response.json({ ok: true });
    }

    // Check if there's a pending edit (from sync_logs)
    const db = createServiceClient();
    const { data: editLog } = await db
      .from("sync_logs")
      .select("id, error_message")
      .like("error_message", "EDIT_PENDING:%")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (editLog?.error_message?.startsWith("EDIT_PENDING:")) {
      const parts = editLog.error_message.split(":");
      const url = parts[1];

      if (text === "건너뛰기") {
        await db.from("sync_logs").delete().eq("id", editLog.id);
        await sendNotification("⏭️ 수정 취소됨");
      } else {
        // Parse edit instructions
        const titleMatch = text.match(/제목:\s*(.+)/);
        const contentMatch = text.match(/내용:\s*([\s\S]+)/);
        const result = await createBotPost({
          url,
          title: titleMatch?.[1]?.trim(),
          content: contentMatch?.[1]?.trim(),
        });
        await db.from("sync_logs").delete().eq("id", editLog.id);
        if (result.success) {
          await sendNotification(`✅ 수정 후 게시 완료\n📝 ${result.title}`);
        } else {
          await sendNotification(`❌ 게시 실패: ${result.error}`);
        }
      }
      return Response.json({ ok: true });
    }

    // URL detection
    const urlMatch = text.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
      const url = urlMatch[0];
      await sendNotification(`🔗 URL 감지 중...\n${url}`);
      const result = await createBotPost({ url });
      if (result.success) {
        await sendNotification(`✅ 게시 완료\n📝 ${result.title}\n📌 ${result.category}`);
      } else {
        await sendNotification(`❌ 실패: ${result.error}`);
      }
    }

    // Commands
    else if (text === "/help") {
      await sendNotification(
        `*OpenResearch 봇 명령어*\n\n` +
        `🔗 URL 전송 → 즉시 AI 포스트 생성\n` +
        `/crawl → 수동 크롤링 (텔레그램 컨펌)\n` +
        `/stats → 커뮤니티 통계\n\n` +
        `크롤 항목은 버튼으로 게시/수정/건너뛰기 선택 가능`
      );
    } else if (text === "/crawl") {
      await sendNotification("🔄 크롤링 시작... 곧 항목들이 도착합니다.");
      const base = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
      fetch(`${base}/api/crawl`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${process.env.CRON_SECRET}` },
      }).catch(console.error);
    } else if (text === "/stats") {
      const { count: active } = await db.from("posts").select("*", { count: "exact", head: true }).eq("status", "active");
      const { count: pending } = await db.from("posts").select("*", { count: "exact", head: true }).eq("status", "pending");
      await sendNotification(`📊 *통계*\n활성: ${active ?? 0}개\n검토 대기: ${pending ?? 0}개`);
    }
  }

  return Response.json({ ok: true });
}
