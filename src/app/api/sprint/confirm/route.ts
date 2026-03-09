/**
 * POST /api/sprint/confirm
 *
 * Owner confirms a draft sprint → status becomes 'active'
 * Optionally can edit items before confirming.
 */

import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sprintId } = await req.json();
  if (!sprintId) {
    return Response.json({ error: "sprintId required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { error } = await supabase
    .from("sprints")
    .update({ status: "active", confirmed_at: new Date().toISOString() })
    .eq("id", sprintId)
    .eq("status", "draft");

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
