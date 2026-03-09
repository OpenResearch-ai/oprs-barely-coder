/**
 * GET/POST /api/sync
 *
 * Vercel Cron: every 6 hours  (0 *\/6 * * *)
 * Manual trigger: POST with Authorization header
 *
 * Full cycle:
 * 1. Create Feature Posts from unprocessed community posts
 * 2. Update existing Feature Posts that have new comments/votes
 * 3. Refresh sprint items from top Feature Posts
 */

import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  synthesizeNewFeaturePosts,
  updateFeaturePost,
  generateSprintFromFeatures,
} from "@/lib/feature-synthesizer";

export const maxDuration = 120;

async function runSync(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServiceClient();
  const now = new Date().toISOString();

  // Start log
  const { data: log } = await db
    .from("sync_logs")
    .insert({ started_at: now, status: "running" })
    .select()
    .single();

  const logId = log?.id;

  try {
    let postsProcessed = 0;
    let fpCreated = 0;
    let fpUpdated = 0;

    // ── Step 1: Get unprocessed community posts ──────────────────
    const { data: newPosts } = await db
      .from("posts")
      .select("*")
      .is("processed_into_feature", null)
      .in("post_type", ["feature", "bug", "question"])
      .order("upvote_count", { ascending: false })
      .limit(50);

    // ── Step 2: Get existing open feature posts ──────────────────
    const { data: existingFeatures } = await db
      .from("feature_posts")
      .select("*, feature_comments(content)")
      .eq("status", "open")
      .order("priority_score", { ascending: false });

    const existingForAI = (existingFeatures ?? []).map((f: any) => ({
      id: f.id,
      title: f.title,
      summary: f.summary,
      post_type: f.post_type,
      product: f.product,
      vote_count: f.vote_count,
      comment_count: f.comment_count,
      source_post_ids: f.source_post_ids ?? [],
      recent_comments: (f.feature_comments ?? [])
        .slice(-10)
        .map((c: any) => c.content),
    }));

    // ── Step 3: Synthesize new Feature Posts ─────────────────────
    if ((newPosts ?? []).length > 0) {
      const drafts = await synthesizeNewFeaturePosts(
        newPosts as any,
        existingForAI
      );

      for (const draft of drafts) {
        if (!draft.title || draft.source_post_ids.length === 0) continue;

        const { data: fp } = await db
          .from("feature_posts")
          .insert({
            title: draft.title,
            summary: draft.summary,
            ai_reasoning: draft.ai_reasoning,
            call_to_action: draft.call_to_action,
            post_type: draft.post_type,
            product: draft.product,
            priority_score: draft.priority_score,
            source_post_ids: draft.source_post_ids,
            last_ai_update: now,
          })
          .select()
          .single();

        if (fp) {
          // Mark source community posts as processed
          await db
            .from("posts")
            .update({ processed_into_feature: fp.id })
            .in("id", draft.source_post_ids);

          fpCreated++;
        }
      }

      postsProcessed = newPosts?.length ?? 0;
    }

    // ── Step 4: Update existing Feature Posts with new comments ──
    const toUpdate = existingForAI.filter(
      (f) => f.recent_comments.length > 0
    );

    for (const feature of toUpdate) {
      const updated = await updateFeaturePost(feature);
      await db
        .from("feature_posts")
        .update({
          summary: updated.summary,
          ai_reasoning: updated.ai_reasoning,
          call_to_action: updated.call_to_action,
          priority_score: updated.priority_score,
          last_ai_update: now,
        })
        .eq("id", feature.id);
      fpUpdated++;
    }

    // ── Step 5: Refresh sprint from top Feature Posts ─────────────
    const { data: topFeatures } = await db
      .from("feature_posts")
      .select("*")
      .eq("status", "open")
      .order("priority_score", { ascending: false })
      .limit(15);

    if ((topFeatures ?? []).length > 0) {
      const sprintItems = await generateSprintFromFeatures(
        (topFeatures ?? []).map((f: any) => ({
          id: f.id,
          title: f.title,
          summary: f.summary,
          post_type: f.post_type ?? "feature",
          product: f.product,
          vote_count: f.vote_count,
          comment_count: f.comment_count,
          source_post_ids: f.source_post_ids ?? [],
          recent_comments: [],
        }))
      );

      // Get or create current sprint
      const weekLabel = getWeekLabel(new Date());
      const monday = getMonday(new Date()).toISOString().split("T")[0];
      const sunday = getSunday(new Date()).toISOString().split("T")[0];

      const { data: sprint } = await db
        .from("sprints")
        .upsert(
          {
            week_label: weekLabel,
            start_date: monday,
            end_date: sunday,
            status: "active",
            ai_summary: `커뮤니티 ${(topFeatures ?? []).length}개 Feature Post 분석 결과입니다.`,
            total_posts_analyzed: postsProcessed,
            total_votes_counted: (topFeatures ?? []).reduce(
              (sum: number, f: any) => sum + f.vote_count, 0
            ),
          },
          { onConflict: "week_label" }
        )
        .select()
        .single();

      if (sprint) {
        // Replace planned sprint items
        await db
          .from("sprint_items")
          .delete()
          .eq("sprint_id", sprint.id)
          .eq("status", "planned");

        if (sprintItems.length > 0) {
          await db.from("sprint_items").insert(
            sprintItems.map((item, i) => ({
              sprint_id: sprint.id,
              title: item.title,
              description: item.description,
              status: "planned",
              product: item.product,
              priority: i + 1,
              source_post_ids: item.source_post_ids,
              community_score: item.community_score,
            }))
          );
        }
      }
    }

    // ── Done ──────────────────────────────────────────────────────
    if (logId) {
      await db.from("sync_logs").update({
        finished_at: new Date().toISOString(),
        posts_processed: postsProcessed,
        feature_posts_created: fpCreated,
        feature_posts_updated: fpUpdated,
        status: "done",
      }).eq("id", logId);
    }

    return Response.json({
      success: true,
      postsProcessed,
      fpCreated,
      fpUpdated,
    });

  } catch (err) {
    if (logId) {
      await db.from("sync_logs").update({
        finished_at: new Date().toISOString(),
        status: "error",
        error_message: String(err),
      }).eq("id", logId);
    }
    console.error("Sync error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) { return runSync(req); }
export async function POST(req: NextRequest) { return runSync(req); }

// ─── Utils ───

function getWeekLabel(date: Date): string {
  const start = new Date(date.getFullYear(), 0, 1);
  const week = Math.ceil(((date.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
  return `${date.getFullYear()} W${String(week).padStart(2, "0")}`;
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function getSunday(date: Date): Date {
  const d = getMonday(date);
  d.setDate(d.getDate() + 6);
  return d;
}
