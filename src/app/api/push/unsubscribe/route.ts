import { NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Login required" }, { status: 401 });

  const { endpoint } = await req.json();
  const db = createServiceClient();

  const query = endpoint
    ? db.from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", endpoint)
    : db.from("push_subscriptions").delete().eq("user_id", user.id);

  await query;
  return Response.json({ success: true });
}
