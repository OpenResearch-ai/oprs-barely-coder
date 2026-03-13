import { NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

// GET: return stored locale preference for logged-in user
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("profiles")
    .select("preferred_locale, auto_locale")
    .eq("id", user.id)
    .maybeSingle();

  return Response.json(data ?? {});
}

// POST: upsert locale preference for logged-in user
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { preferred_locale, auto_locale } = await req.json();

  const db = createServiceClient();
  const { error } = await db
    .from("profiles")
    .upsert({
      id: user.id,
      preferred_locale: preferred_locale ?? "ko",
      auto_locale: auto_locale ?? "ko",
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
