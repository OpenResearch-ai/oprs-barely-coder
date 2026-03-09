/**
 * POST /api/posts/[id]/vote   — upvote
 * DELETE /api/posts/[id]/vote — un-vote
 */

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: "Login required" }, { status: 401 });
  }

  const { error } = await supabase
    .from("votes")
    .insert({ post_id: postId, user_id: user.id });

  if (error?.code === "23505") {
    return Response.json({ error: "Already voted" }, { status: 409 });
  }
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: "Login required" }, { status: 401 });
  }

  const { error } = await supabase
    .from("votes")
    .delete()
    .eq("post_id", postId)
    .eq("user_id", user.id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
