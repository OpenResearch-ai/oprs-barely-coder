import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPostTranslation, getCommentTranslation } from "@/lib/translator";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const locale = searchParams.get("locale") ?? "en";
  const quick = searchParams.get("quick") === "1"; // cache-only, no Gemini calls

  if (locale === "ko") return Response.json({ locale });

  const supabase = await createClient();

  const { data: post } = await supabase
    .from("posts")
    .select("title, content, translations")
    .eq("id", id)
    .single();

  if (!post) return Response.json({ error: "Not found" }, { status: 404 });

  // Quick mode: return only what's already cached
  if (quick) {
    const cached = (post.translations as Record<string, { title?: string; content?: string }> | null)?.[locale];
    return Response.json({
      locale,
      post: cached ?? null,
      cached: !!cached,
    });
  }

  // Full mode: translate everything (uses cache when available)
  const { data: rawComments } = await supabase
    .from("comments")
    .select("id, content, is_deleted")
    .eq("post_id", id)
    .order("created_at", { ascending: true });

  const [translatedPost, translatedComments] = await Promise.all([
    getPostTranslation(id, { title: post.title, content: post.content }, locale),
    Promise.all(
      (rawComments ?? []).map(async c => {
        if (c.is_deleted || !c.content) return { id: c.id, content: c.content };
        const content = await getCommentTranslation(c.id, c.content, locale);
        return { id: c.id, content };
      })
    ),
  ]);

  return Response.json({
    locale,
    post: translatedPost,
    comments: translatedComments,
  });
}
