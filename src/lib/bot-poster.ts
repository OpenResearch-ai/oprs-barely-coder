/**
 * Bot poster — creates community posts as OpenResearch AI bot
 * Used by: Telegram URL handler, auto-crawler
 */

import { GoogleGenAI } from "@google/genai";
import { createServiceClient } from "@/lib/supabase/server";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

export type PostCategory =
  | "community" | "showcase" | "resource" | "question"
  | "proposal" | "feature" | "bug";

export interface BotPostInput {
  url?: string;
  title?: string;
  content?: string;          // raw content to summarize
  forcedCategory?: PostCategory;
}

export interface BotPostResult {
  success: boolean;
  postId?: string;
  title?: string;
  category?: PostCategory;
  error?: string;
}

const CATEGORY_GUIDE = `
Categories:
- community: general AI/vibe coding discussion, news, trends
- resource: useful tools, libraries, articles, tutorials
- showcase: demos, projects people built with AI
- proposal: ideas for new OpenResearch products/services
- feature: feature requests for oo.ai or o talk
- bug: bug reports
- question: questions about AI, LLM, vibe coding
`;

export async function createBotPost(input: BotPostInput): Promise<BotPostResult> {
  const db = createServiceClient();

  // Fetch URL content if provided
  let rawContent = input.content ?? "";
  let sourceUrl = input.url;

  if (input.url && !input.content) {
    try {
      const res = await fetch(input.url, {
        headers: { "User-Agent": "OpenResearch-Bot/1.0" },
        signal: AbortSignal.timeout(8000),
      });
      const html = await res.text();
      // Extract text content roughly
      rawContent = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 3000);
    } catch {
      rawContent = `URL: ${input.url}`;
    }
  }

  // Ask Gemini to create the post
  const prompt = `You are the OpenResearch AI community manager. Create a Korean community post for this content.

${CATEGORY_GUIDE}

Source URL: ${sourceUrl ?? "none"}
Content: ${rawContent.slice(0, 2000)}

Create an engaging Korean community post. Be informative and add context for the OpenResearch community (vibe coders, AI enthusiasts).

Output JSON only:
{
  "title": "Korean title (max 80 chars, engaging)",
  "body": "Korean summary/discussion starter (2-4 sentences, add our own perspective)",
  "category": "one of: community|resource|showcase|proposal|feature|bug|question",
  "product": "oo.ai|o talk|platform|null"
}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { maxOutputTokens: 500, responseMimeType: "application/json" },
    });

    const raw = response.text ?? "{}";
    const parsed = JSON.parse(raw);

    if (!parsed.title) throw new Error("No title generated");

    const category: PostCategory = input.forcedCategory ?? (parsed.category as PostCategory) ?? "community";

    const { data: post, error } = await db
      .from("posts")
      .insert({
        title: parsed.title,
        content: parsed.body ?? null,
        author_id: null,
        author_name: "OpenResearch AI",
        post_type: category,
        product: parsed.product !== "null" ? parsed.product : null,
        tags: [],
        locale: "ko",
        status: "active",  // bot posts are auto-approved
        source_url: sourceUrl ?? null,
        is_bot_post: true,
        ai_moderation_result: { verdict: "PASS", reason: "bot post", isBannable: false },
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, postId: post.id, title: parsed.title, category };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
