const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID!;
const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function tgFetch(method: string, body: object) {
  const res = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) {
    console.error(`Telegram ${method} error:`, data.description);
  }
  return data;
}

export async function sendModerationRequest(post: {
  id: string;
  title: string;
  content: string | null;
  post_type: string;
  product: string | null;
  author_name: string;
  ai_reason: string;
}) {
  const typeEmoji: Record<string, string> = {
    vibe_coding: "✨", ai: "🤖", showcase: "🚀", resource: "📎",
    question: "❓", proposal: "💡", feature: "⚡", bug: "🐛", community: "💬",
  };

  const lines = [
    `🔍 게시글 검토 요청`,
    ``,
    `${typeEmoji[post.post_type] ?? "📝"} ${post.title}`,
    post.content ? post.content.slice(0, 200) + (post.content.length > 200 ? "..." : "") : "",
    ``,
    `👤 ${post.author_name}  |  📌 ${post.post_type}${post.product ? `  |  🏷️ ${post.product}` : ""}`,
    `🤖 AI: ${post.ai_reason}`,
  ].filter(line => line !== undefined);

  await tgFetch("sendMessage", {
    chat_id: CHAT_ID,
    text: lines.join("\n"),
    reply_markup: {
      inline_keyboard: [[
        { text: "✅ 승인", callback_data: `approve:${post.id}` },
        { text: "❌ 거절", callback_data: `reject:${post.id}` },
      ]],
    },
  });
}

export async function sendNotification(message: string) {
  await tgFetch("sendMessage", {
    chat_id: CHAT_ID,
    text: message,
  });
}

export async function answerCallbackQuery(callbackQueryId: string, text: string) {
  await tgFetch("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
  });
}

export async function editMessageReplyMarkup(
  chatId: string | number,
  messageId: number,
  text: string
) {
  await tgFetch("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
  });
}
