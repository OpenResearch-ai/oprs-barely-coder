/**
 * POST /api/agent/posts/[id]/comment — Post a comment as agent
 * Typical uses: release notification, duplicate detection, severity tagging
 */

import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAgentKey, hasPermission } from "@/lib/agent-auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params;
  const agent = await verifyAgentKey(req.headers.get("authorization"));
  if (!agent) return Response.json({ error: "Invalid API key" }, { status: 401 });
  if (!hasPermission(agent, "comment")) return Response.json({ error: "Insufficient permissions" }, { status: 403 });

  const { content, image_url, also_resolve } = await req.json();
  if (!content?.trim()) return Response.json({ error: "content is required" }, { status: 400 });

  const db = createServiceClient();

  // Verify post exists
  const { data: post } = await db.from("posts").select("id, title").eq("id", postId).single();
  if (!post) return Response.json({ error: "Post not found" }, { status: 404 });

  // Create comment
  const { data: comment, error } = await db.from("comments").insert({
    post_id: postId,
    author_id: null,
    author_name: agent.displayName,
    content: content.trim(),
    image_url: image_url ?? null,
    parent_id: null,
  }).select().single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Optionally mark post as resolved
  if (also_resolve) {
    await db.from("posts").update({ agent_status: "resolved" }).eq("id", postId);
  }

  return Response.json({ comment, agent: agent.serviceName }, { status: 201 });
}
