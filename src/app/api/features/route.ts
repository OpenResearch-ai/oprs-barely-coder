import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const product = searchParams.get("product");
  const status = searchParams.get("status") ?? "open";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);

  const db = createServiceClient();
  let query = db
    .from("feature_posts")
    .select("*")
    .eq("status", status)
    .order("priority_score", { ascending: false })
    .limit(limit);

  if (product) query = query.eq("product", product);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ features: data ?? [] });
}
