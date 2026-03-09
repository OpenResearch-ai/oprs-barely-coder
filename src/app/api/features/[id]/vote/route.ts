import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { createHash } from "crypto";

async function getVoterKey(req: NextRequest): Promise<string> {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") ?? headersList.get("x-real-ip") ?? "unknown";
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const voterKey = await getVoterKey(req);
  const db = createServiceClient();

  const { error } = await db
    .from("feature_votes")
    .insert({ feature_post_id: id, voter_key: voterKey });

  if (error?.code === "23505") {
    return Response.json({ error: "Already voted" }, { status: 409 });
  }
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const voterKey = await getVoterKey(req);
  const db = createServiceClient();

  await db
    .from("feature_votes")
    .delete()
    .eq("feature_post_id", id)
    .eq("voter_key", voterKey);

  return Response.json({ success: true });
}
