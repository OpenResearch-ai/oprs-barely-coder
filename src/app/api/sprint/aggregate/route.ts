/**
 * POST /api/sprint/aggregate
 *
 * Triggered weekly (Vercel Cron: every Monday 00:00 UTC)
 * or manually by the owner.
 *
 * 1. Fetches all posts from the past 7 days
 * 2. Runs Gemini aggregation
 * 3. Creates a draft sprint + items in Supabase
 */

import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { aggregateSprint } from "@/lib/sprint-aggregator";
import type { Post } from "@/lib/supabase/types";

export const maxDuration = 60; // Vercel function timeout

async function runAggregation(req: NextRequest) {
  // Verify cron secret (Vercel sets this automatically for cron jobs)
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  try {
    // Fetch posts from the past 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: posts, error: postsError } = await supabase
      .from("posts")
      .select("*")
      .gte("created_at", sevenDaysAgo)
      .order("upvote_count", { ascending: false });

    if (postsError) throw postsError;
    if (!posts || posts.length === 0) {
      return Response.json({ message: "No posts to aggregate" });
    }

    // Run Gemini aggregation
    const result = await aggregateSprint(posts as Post[]);

    // Calculate sprint dates (Mon–Sun of current week)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const startDate = monday.toISOString().split("T")[0];
    const endDate = sunday.toISOString().split("T")[0];

    // Upsert sprint (in case it already exists for this week)
    const { data: sprint, error: sprintError } = await supabase
      .from("sprints")
      .upsert(
        {
          week_label: result.weekLabel,
          start_date: startDate,
          end_date: endDate,
          status: "draft",
          ai_summary: result.summary,
          total_posts_analyzed: result.totalPostsAnalyzed,
          total_votes_counted: result.totalVotesCounted,
        },
        { onConflict: "week_label" }
      )
      .select()
      .single();

    if (sprintError) throw sprintError;

    // Delete old draft items and re-insert
    await supabase
      .from("sprint_items")
      .delete()
      .eq("sprint_id", sprint.id)
      .eq("status", "planned");

    const itemsToInsert = result.items.map((item) => ({
      ...item,
      sprint_id: sprint.id,
    }));

    const { error: itemsError } = await supabase
      .from("sprint_items")
      .insert(itemsToInsert);

    if (itemsError) throw itemsError;

    // Mark posts as linked to this sprint
    const allSourceIds = result.items.flatMap((i) => i.source_post_ids ?? []);
    if (allSourceIds.length > 0) {
      await supabase
        .from("posts")
        .update({ sprint_id: sprint.id })
        .in("id", allSourceIds);
    }

    return Response.json({
      success: true,
      sprint: {
        id: sprint.id,
        weekLabel: result.weekLabel,
        itemCount: result.items.length,
        postsAnalyzed: result.totalPostsAnalyzed,
      },
    });
  } catch (error) {
    console.error("Sprint aggregation error:", error);
    return Response.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}

// GET — triggered by Vercel Cron every Monday 00:00 UTC
export async function GET(req: NextRequest) {
  return runAggregation(req);
}

// POST — manual trigger by owner
export async function POST(req: NextRequest) {
  return runAggregation(req);
}
