/**
 * Admin-only: Manage agent API keys
 * POST /api/agent/keys — Issue a new API key
 * GET  /api/agent/keys — List all keys (hashed, safe to display)
 */

import { NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createHash, randomBytes } from "crypto";
import { isAdmin } from "@/lib/admin";

function hashKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) {
    return Response.json({ error: "Admin only" }, { status: 403 });
  }

  const { service_name, display_name, avatar_emoji, permissions } = await req.json();
  if (!service_name || !display_name) {
    return Response.json({ error: "service_name and display_name are required" }, { status: 400 });
  }

  const rawKey = `or_agent_${randomBytes(32).toString("hex")}`;
  const keyHash = hashKey(rawKey);

  const db = createServiceClient();
  const { data, error } = await db.from("agent_api_keys").insert({
    key_hash: keyHash,
    service_name,
    display_name,
    avatar_emoji: avatar_emoji ?? "🤖",
    permissions: permissions ?? ["read", "write", "comment"],
  }).select("id, service_name, display_name, permissions, created_at").single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({
    ...data,
    api_key: rawKey, // Only shown once! Store securely.
    warning: "Save this API key now. It will not be shown again.",
  }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) {
    return Response.json({ error: "Admin only" }, { status: 403 });
  }

  const db = createServiceClient();
  const { data, error } = await db.from("agent_api_keys")
    .select("id, service_name, display_name, avatar_emoji, permissions, is_active, created_at, last_used_at")
    .order("created_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ keys: data });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) {
    return Response.json({ error: "Admin only" }, { status: 403 });
  }

  const { id } = await req.json();
  const db = createServiceClient();
  await db.from("agent_api_keys").update({ is_active: false }).eq("id", id);
  return Response.json({ success: true });
}
