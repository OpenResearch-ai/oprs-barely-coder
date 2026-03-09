/**
 * GET  /api/agent/sprint — Get posts suitable for sprint planning
 * POST /api/agent/sprint — Create sprint items from community posts (agent-driven)
 *
 * Returns structured data optimized for LLM sprint planning
 */

import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAgentKey } from "@/lib/agent-auth";

export async function GET(req: NextRequest) {
  const agent = await verifyAgentKey(req.headers.get("authorization"));
  if (!agent) return Response.json({ error: "Invalid API key" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const product = searchParams.get("product"); // filter by product
  const days    = parseInt(searchParams.get("days") ?? "7"); // lookback window
  const db = createServiceClient();

  const since = new Date(Date.now() - days * 86400000).toISOString();

  // Fetch actionable posts (bugs + feature requests + proposals)
  let query = db.from("posts")
    .select(`
      id, title, content, post_type, product,
      upvote_count, comment_count, agent_status, created_at
    `)
    .eq("status", "active")
    .in("post_type", ["bug", "feature", "proposal"])
    .in("agent_status", ["open", "in_progress"])
    .gte("created_at", since)
    .order("upvote_count", { ascending: false })
    .limit(100);

  if (product) query = query.eq("product", product);

  const { data: posts, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Group for sprint planning
  const bugs     = posts?.filter(p => p.post_type === "bug")      ?? [];
  const features = posts?.filter(p => p.post_type === "feature")  ?? [];
  const proposals = posts?.filter(p => p.post_type === "proposal") ?? [];

  return Response.json({
    summary: {
      total: posts?.length ?? 0,
      bugs: bugs.length,
      features: features.length,
      proposals: proposals.length,
      lookback_days: days,
      product_filter: product ?? "all",
    },
    sprint_candidates: {
      // P1: High-upvote bugs
      p1_bugs: bugs.filter(p => p.upvote_count >= 5).slice(0, 5),
      // P2: High-upvote features
      p2_features: features.filter(p => p.upvote_count >= 3).slice(0, 10),
      // P3: Other items
      p3_proposals: proposals.slice(0, 5),
    },
    raw_posts: posts,
    agent: agent.serviceName,
  });
}

export async function POST(req: NextRequest) {
  const agent = await verifyAgentKey(req.headers.get("authorization"));
  if (!agent) return Response.json({ error: "Invalid API key" }, { status: 401 });

  const body = await req.json();
  const { week_label, items, ai_summary, source_post_ids } = body;

  if (!week_label || !items?.length) {
    return Response.json({ error: "week_label and items are required" }, { status: 400 });
  }

  const db = createServiceClient();
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const { data: sprint, error: sprintError } = await db.from("sprints").upsert({
    week_label,
    start_date: monday.toISOString().split("T")[0],
    end_date: sunday.toISOString().split("T")[0],
    status: "active",
    ai_summary: ai_summary ?? `${agent.serviceName} 에이전트가 생성한 스프린트`,
    total_posts_analyzed: source_post_ids?.length ?? 0,
  }, { onConflict: "week_label" }).select().single();

  if (sprintError) return Response.json({ error: sprintError.message }, { status: 500 });

  // Insert sprint items
  const itemsToInsert = items.map((item: any, i: number) => ({
    sprint_id: sprint.id,
    title: item.title,
    description: item.description ?? null,
    status: item.status ?? "planned",
    product: item.product ?? null,
    priority: item.priority ?? (i + 1),
    source_post_ids: item.source_post_ids ?? [],
    community_score: item.community_score ?? 0,
  }));

  await db.from("sprint_items").delete().eq("sprint_id", sprint.id).eq("status", "planned");
  const { error: itemsError } = await db.from("sprint_items").insert(itemsToInsert);
  if (itemsError) return Response.json({ error: itemsError.message }, { status: 500 });

  // Mark source posts as in_progress
  if (source_post_ids?.length) {
    await db.from("posts").update({ agent_status: "in_progress", assigned_service: agent.serviceName })
      .in("id", source_post_ids);
  }

  return Response.json({ sprint, items: itemsToInsert, agent: agent.serviceName }, { status: 201 });
}
