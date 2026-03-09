/**
 * GET /api/agent/keys — Show configured agents (admin only, no secrets)
 * Tokens are managed via environment variables, not DB.
 */

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) {
    return Response.json({ error: "Admin only" }, { status: 403 });
  }

  return Response.json({
    agents: [
      { service: "oo.ai",        env: "AGENT_TOKEN_OOAI",     active: !!process.env.AGENT_TOKEN_OOAI },
      { service: "o talk",       env: "AGENT_TOKEN_OTALK",    active: !!process.env.AGENT_TOKEN_OTALK },
      { service: "openresearch", env: "AGENT_TOKEN_PLATFORM", active: !!process.env.AGENT_TOKEN_PLATFORM },
    ],
    note: "Tokens live in env vars. Set them in Vercel dashboard or .env.local",
  });
}
