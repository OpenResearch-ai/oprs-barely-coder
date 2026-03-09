import { GoogleGenAI } from "@google/genai";
import { NextRequest } from "next/server";
import { headers } from "next/headers";
import { createHash } from "crypto";
import { TOOL_DECLARATIONS } from "@/lib/tool-declarations";
import { checkRateLimit, formatRetryMessage } from "@/lib/rate-limiter";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

const SYSTEM_PROMPT = `You are the OpenResearch AI assistant — an intelligent page assistant for openresearch.ai.
You can BOTH answer questions AND control the page using tools.

## When to use tools
- User asks to navigate somewhere → navigate_page
- User asks to find/search posts → search_community
- User asks about a category or type → filter_community
- User wants to write a post → open_write_modal
- User wants to reset/show all → clear_filters
- Combine tools freely: e.g. navigate to community THEN filter by AI

## After using tools, briefly explain what you did and what the user sees.

## About OpenResearch
- "코딩은 쥐뿔도 안하지만" — vibe coding company, agents do the work
- YouTube: @vibe.hacker
- Products: oo.ai (AI search, live), o talk (AI messenger, coming soon), openresearch.ai (this site)
- Community feedback → AI sprint every week → agents develop it

## Language
Respond in the user's language. Korean → Korean. English → English.

## Tone
Friendly, concise. When you use a tool, announce it naturally:
"커뮤니티에서 AI 글들을 찾아볼게요!" then call the tool, then summarize what's there.`;

export async function POST(req: NextRequest) {
  try {
    const { messages, locale, pageContext } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: "Invalid messages" }, { status: 400 });
    }

    // ── Auth & Rate limiting ─────────────────────────────
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Check ban
    if (user) {
      const db = createServiceClient();
      const { data: ban } = await db
        .from("user_bans")
        .select("banned_until, ban_count")
        .eq("user_id", user.id)
        .single();
      if (ban && new Date(ban.banned_until) > new Date()) {
        const remainingMs = new Date(ban.banned_until).getTime() - Date.now();
        const hours = Math.ceil(remainingMs / 3600000);
        return Response.json({
          error: "banned",
          message: `계정이 ${hours}시간 동안 이용 제한되었습니다.`,
        }, { status: 403 });
      }
    }

    // Rate limit key
    let rlKey: string;
    let rlType: "chat:anon" | "chat:user";
    if (user) {
      rlKey = `chat:user:${user.id}`;
      rlType = "chat:user";
    } else {
      const headersList = await headers();
      const ip = headersList.get("x-forwarded-for") ?? headersList.get("x-real-ip") ?? "unknown";
      const ipHash = createHash("sha256").update(ip).digest("hex").slice(0, 16);
      rlKey = `chat:anon:${ipHash}`;
      rlType = "chat:anon";
    }

    const rl = await checkRateLimit(rlKey, rlType);
    if (!rl.allowed) {
      return Response.json({
        error: "rate_limited",
        message: formatRetryMessage(rl.retryAfterMinutes, locale),
        retryAfterMinutes: rl.retryAfterMinutes,
        requiresLogin: !user,
      }, { status: 429 });
    }
    // ────────────────────────────────────────────────────

    let systemWithContext = SYSTEM_PROMPT;
    if (pageContext?.posts?.length > 0) {
      systemWithContext += `\n\n## Current page posts (use IDs for highlight_posts tool)\n` +
        pageContext.posts.map((p: { id: string; title: string; type: string; product?: string }) =>
          `- ID: ${p.id} | "${p.title}" | type:${p.type}${p.product ? ` | product:${p.product}` : ""}`
        ).join("\n");
    }
    if (locale) {
      systemWithContext += `\n\n## Current locale: ${locale}`;
    }

    const geminiMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const response = await ai.models.generateContentStream({
      model: "gemini-3.1-flash-lite-preview",
      contents: geminiMessages,
      config: {
        systemInstruction: systemWithContext,
        maxOutputTokens: 1024,
        tools: [{ functionDeclarations: TOOL_DECLARATIONS as any[] }],
        toolConfig: { functionCallingConfig: { mode: "AUTO" as any } },
      },
    });

    const readableStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (data: object) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

        try {
          for await (const chunk of response) {
            // Text chunks
            if (chunk.text) {
              send({ text: chunk.text });
            }

            // Function calls
            const parts = chunk.candidates?.[0]?.content?.parts ?? [];
            for (const part of parts) {
              if (part.functionCall) {
                send({
                  tool_call: {
                    name: part.functionCall.name,
                    args: part.functionCall.args ?? {},
                  },
                });
              }
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          console.error("Chat stream error:", err);
          controller.error(err);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
