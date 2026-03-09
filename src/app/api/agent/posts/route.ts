/**
 * Agent API — Posts
 *
 * GET  /api/agent/posts   — List posts (filtered for agent workflow)
 * POST /api/agent/posts   — Create a post as agent (release notes, announcements, etc.)
 *
 * Auth: Authorization: Bearer or_agent_xxxxx
 */

import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAgentKey, hasPermission } from "@/lib/agent-auth";

export async function GET(req: NextRequest) {
  const agent = await verifyAgentKey(req.headers.get("authorization"));
  if (!agent) return Response.json({ error: "Invalid API key" }, { status: 401 });
  if (!hasPermission(agent, "read")) return Response.json({ error: "Insufficient permissions" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const db = createServiceClient();

  // Filters
  const postType    = searchParams.get("type");       // feature | bug | proposal | ...
  const product     = searchParams.get("product");    // oo.ai | o talk | platform
  const agentStatus = searchParams.get("status");     // open | in_progress | resolved
  const since       = searchParams.get("since");      // ISO date — posts since this date
  const limit       = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);
  const sort        = searchParams.get("sort") ?? "new"; // new | top

  let query = db.from("posts").select(`
    id, title, content, post_type, product, source_url,
    upvote_count, comment_count, author_name,
    agent_status, assigned_service,
    created_at, updated_at
  `).eq("status", "active");

  if (postType)    query = query.eq("post_type", postType);
  if (product)     query = query.eq("product", product);
  if (agentStatus) query = query.eq("agent_status", agentStatus);
  if (since)       query = query.gte("created_at", since);

  query = sort === "top"
    ? query.order("upvote_count", { ascending: false })
    : query.order("created_at", { ascending: false });

  query = query.limit(limit);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({
    posts: data,
    count: data?.length ?? 0,
    agent: agent.serviceName,
  });
}

export async function POST(req: NextRequest) {
  const agent = await verifyAgentKey(req.headers.get("authorization"));
  if (!agent) return Response.json({ error: "Invalid API key" }, { status: 401 });
  if (!hasPermission(agent, "write")) return Response.json({ error: "Insufficient permissions" }, { status: 403 });

  const body = await req.json();
  const { title, content, post_type, product, source_url, image_url } = body;

  if (!title?.trim()) return Response.json({ error: "title is required" }, { status: 400 });

  const db = createServiceClient();
  const { data: post, error } = await db.from("posts").insert({
    title: title.trim(),
    content: content?.trim() ?? null,
    post_type: post_type ?? "community",
    product: product ?? null,
    source_url: source_url ?? null,
    image_url: image_url ?? null,
    author_id: null,
    author_name: agent.displayName,
    tags: [],
    locale: "ko",
    status: "active",           // agent posts are auto-approved
    is_bot_post: true,
    ai_moderation_result: { verdict: "PASS", reason: `agent post: ${agent.serviceName}` },
  }).select().single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ post, agent: agent.serviceName }, { status: 201 });
}
