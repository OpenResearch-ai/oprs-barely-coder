import { GoogleGenAI } from "@google/genai";
import { createServiceClient } from "@/lib/supabase/server";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

interface TranslateResult {
  title?: string;
  content?: string;
}

/**
 * Translate text to the target locale using Gemini.
 * Returns null if translation fails (caller should fall back to original).
 */
async function translateTexts(
  texts: { title?: string; content?: string },
  targetLocale: string
): Promise<TranslateResult | null> {
  const LANG: Record<string, string> = { en: "English" };
  const langName = LANG[targetLocale];
  if (!langName) return null;

  const parts: string[] = [];
  if (texts.title) parts.push(`TITLE: ${texts.title}`);
  if (texts.content) parts.push(`CONTENT: ${texts.content}`);
  if (parts.length === 0) return null;

  const prompt = `Translate the following Korean text to ${langName}.
Keep technical terms, brand names (oo.ai, o talk, OpenResearch, etc.), URLs, and code snippets as-is.
Preserve the tone and style. Return ONLY the translated text in JSON format with the same keys provided.

Input:
${parts.join("\n\n")}

Return JSON like: ${texts.content ? '{"title":"...","content":"..."}' : '{"title":"..."}'}`;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { responseMimeType: "application/json", maxOutputTokens: 1000 },
    });
    const text = result.text ?? "";
    return JSON.parse(text) as TranslateResult;
  } catch (e) {
    console.error("[translator] Gemini error:", e);
    return null;
  }
}

/**
 * Get or create English translation for a post.
 * Checks DB cache first; translates and saves if missing.
 */
export async function getPostTranslation(
  postId: string,
  original: { title: string; content: string | null },
  targetLocale: string
): Promise<{ title: string; content: string | null }> {
  if (targetLocale === "ko") return original;

  const db = createServiceClient();

  // Check cache
  const { data: post } = await db
    .from("posts")
    .select("translations")
    .eq("id", postId)
    .single();

  const cached = (post?.translations as Record<string, TranslateResult> | null)?.[targetLocale];
  // Use cache only if both title AND content are cached (or content is intentionally null)
  if (cached?.title && ("content" in (cached ?? {}))) {
    return {
      title: cached.title,
      content: cached.content ?? original.content,
    };
  }

  // Translate
  const translated = await translateTexts(
    { title: original.title, content: original.content ?? undefined },
    targetLocale
  );
  if (!translated) return original;

  // Save to cache
  const existing = (post?.translations as Record<string, unknown>) ?? {};
  await db
    .from("posts")
    .update({ translations: { ...existing, [targetLocale]: translated } })
    .eq("id", postId);

  return {
    title: translated.title ?? original.title,
    content: translated.content ?? original.content,
  };
}

/**
 * Get or create English translation for a comment.
 */
export async function getCommentTranslation(
  commentId: string,
  originalContent: string,
  targetLocale: string
): Promise<string> {
  if (targetLocale === "ko") return originalContent;

  const db = createServiceClient();

  // Check cache
  const { data: comment } = await db
    .from("comments")
    .select("translations")
    .eq("id", commentId)
    .single();

  const cached = (comment?.translations as Record<string, { content?: string }> | null)?.[targetLocale];
  if (cached?.content) return cached.content;

  // Translate
  const translated = await translateTexts({ content: originalContent }, targetLocale);
  if (!translated?.content) return originalContent;

  // Save to cache
  const existing = (comment?.translations as Record<string, unknown>) ?? {};
  await db
    .from("comments")
    .update({ translations: { ...existing, [targetLocale]: { content: translated.content } } })
    .eq("id", commentId);

  return translated.content;
}

/**
 * Batch translate post titles (for list view).
 * Only translates missing ones, returns map of postId -> translated title.
 */
export async function batchTranslatePostTitles(
  posts: { id: string; title: string; translations?: Record<string, TranslateResult> | null }[],
  targetLocale: string
): Promise<Record<string, string>> {
  if (targetLocale === "ko") return {};

  const result: Record<string, string> = {};
  const toTranslate: typeof posts = [];

  for (const post of posts) {
    const cached = post.translations?.[targetLocale];
    if (cached?.title) {
      result[post.id] = cached.title;
    } else {
      toTranslate.push(post);
    }
  }

  if (toTranslate.length === 0) return result;

  // Translate in parallel (up to 5 at a time to avoid rate limits)
  const chunks = [];
  for (let i = 0; i < toTranslate.length; i += 5) {
    chunks.push(toTranslate.slice(i, i + 5));
  }

  const db = createServiceClient();

  for (const chunk of chunks) {
    await Promise.all(chunk.map(async (post) => {
      const translated = await translateTexts({ title: post.title }, targetLocale);
      if (!translated?.title) {
        result[post.id] = post.title;
        return;
      }
      result[post.id] = translated.title;

      // Save to cache
      const { data: existing } = await db
        .from("posts")
        .select("translations")
        .eq("id", post.id)
        .single();
      const existingTranslations = (existing?.translations as Record<string, unknown>) ?? {};
      await db
        .from("posts")
        .update({ translations: { ...existingTranslations, [targetLocale]: { title: translated.title } } })
        .eq("id", post.id);
    }));
  }

  return result;
}
