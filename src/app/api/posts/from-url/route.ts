import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createBotPost } from "@/lib/bot-poster";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Login required" }, { status: 401 });

  const { url } = await req.json();
  if (!url) return Response.json({ error: "URL required" }, { status: 400 });

  const result = await createBotPost({ url });

  if (!result.success) {
    return Response.json({ error: result.error }, { status: 500 });
  }

  return Response.json({ postId: result.postId, title: result.title }, { status: 201 });
}
