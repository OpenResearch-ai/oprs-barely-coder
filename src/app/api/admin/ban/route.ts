import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { banUser } from "@/lib/ban-manager";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Admin only
  if (!user || !isAdmin(user.email)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, reason } = await req.json();
  if (!userId || !reason) {
    return Response.json({ error: "userId and reason required" }, { status: 400 });
  }

  await banUser({
    userId,
    userName: "unknown",
    reason,
    violationContent: `Admin ban via chat: ${reason}`,
  });

  return Response.json({ success: true });
}
