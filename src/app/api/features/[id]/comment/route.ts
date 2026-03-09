import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { content, author_name } = await req.json();

  if (!content?.trim()) {
    return Response.json({ error: "Content required" }, { status: 400 });
  }

  const db = createServiceClient();
  const { data, error } = await db
    .from("feature_comments")
    .insert({
      feature_post_id: id,
      content: content.trim(),
      author_name: author_name?.trim() || "anonymous",
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ comment: data }, { status: 201 });
}
