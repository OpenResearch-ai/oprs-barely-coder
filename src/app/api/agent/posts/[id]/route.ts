/**
 * PATCH /api/agent/posts/[id]  — Update post status (open→in_progress→resolved)
 * GET   /api/agent/posts/[id]  — Get single post with comments
 */

import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAgentKey, hasPermission } from "@/lib/agent-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const agent = await verifyAgentKey(req.headers.get("authorization"));
  if (!agent) return Response.json({ error: "Invalid API key" }, { status: 401 });

  const db = createServiceClient();
  const [{ data: post }, { data: comments }] = await Promise.all([
    db.from("posts").select("*").eq("id", id).single(),
    db.from("comments").select("*").eq("post_id", id).order("created_at"),
  ]);

  if (!post) return Response.json({ error: "Post not found" }, { status: 404 });
  return Response.json({ post, comments: comments ?? [] });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const agent = await verifyAgentKey(req.headers.get("authorization"));
  if (!agent) return Response.json({ error: "Invalid API key" }, { status: 401 });
  if (!hasPermission(agent, "write")) return Response.json({ error: "Insufficient permissions" }, { status: 403 });

  const body = await req.json();
  const allowed = ["agent_status", "assigned_service"];
  const updates: Record<string, string> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const db = createServiceClient();
  const { data, error } = await db.from("posts").update(updates).eq("id", id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ post: data, agent: agent.serviceName });
}
