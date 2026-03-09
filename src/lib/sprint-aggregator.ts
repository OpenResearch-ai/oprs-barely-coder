/**
 * Sprint Aggregator
 *
 * Weekly AI process:
 * 1. Fetch posts from the past 7 days
 * 2. Score by: upvotes + (comments * 0.5) + recency bonus
 * 3. Send top posts to Gemini for grouping + sprint item generation
 * 4. Store sprint + items in Supabase
 */

import { GoogleGenAI } from "@google/genai";
import type { Post, SprintItem } from "./supabase/types";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

export interface AggregationResult {
  weekLabel: string;
  summary: string;
  items: Omit<SprintItem, "id" | "sprint_id" | "created_at">[];
  totalPostsAnalyzed: number;
  totalVotesCounted: number;
}

function getWeekLabel(date: Date): string {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const week = Math.ceil(
    ((date.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
  );
  return `${date.getFullYear()} W${String(week).padStart(2, "0")}`;
}

function scorePost(post: Post): number {
  const ageHours =
    (Date.now() - new Date(post.created_at).getTime()) / 3600000;
  // Recency bonus: posts < 24h get +10, < 48h get +5
  const recency = ageHours < 24 ? 10 : ageHours < 48 ? 5 : 0;
  return post.upvote_count + post.comment_count * 0.5 + recency;
}

export async function aggregateSprint(posts: Post[]): Promise<AggregationResult> {
  const now = new Date();
  const weekLabel = getWeekLabel(now);

  // Score and sort posts
  const scoredPosts = posts
    .map((p) => ({ post: p, score: scorePost(p) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 30); // top 30 to keep prompt manageable

  const totalVotesCounted = scoredPosts.reduce(
    (sum, { post }) => sum + post.upvote_count,
    0
  );

  // Build the prompt
  const postsForPrompt = scoredPosts.map(({ post, score }) => ({
    id: post.id,
    title: post.title,
    content: post.content?.slice(0, 200),
    type: post.post_type,
    product: post.product,
    upvotes: post.upvote_count,
    comments: post.comment_count,
    score: Math.round(score),
    tags: post.tags,
  }));

  const prompt = `You are an AI product manager for OpenResearch, an AI company.

Analyze the following community posts from the past week and generate sprint items for next week's development sprint.

## Community Posts (sorted by community score)
${JSON.stringify(postsForPrompt, null, 2)}

## Instructions
1. Group similar posts together (e.g., multiple dark mode requests → one sprint item)
2. Generate 4–8 sprint items that would deliver the most value to the community
3. Prioritize: high-vote bugs > high-vote features > improvements
4. For each item, list which post IDs it covers
5. Write a short summary (2–3 sentences) explaining why this sprint focuses on these items

## Required Output Format (JSON only, no markdown)
{
  "summary": "string — 2-3 sentence explanation of sprint focus",
  "items": [
    {
      "title": "string — clear, actionable title",
      "description": "string — what will be built and why the community wants it",
      "status": "planned",
      "product": "oo.ai" | "o talk" | "platform" | null,
      "priority": number (1 = highest),
      "source_post_ids": ["post-id-1", "post-id-2"],
      "community_score": number (sum of source post scores)
    }
  ]
}`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
    },
  });

  const raw = response.text;
  if (!raw) throw new Error("Empty response from Gemini");

  let parsed: { summary: string; items: Omit<SprintItem, "id" | "sprint_id" | "created_at">[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Try to extract JSON if wrapped in markdown
    const match = raw.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
    if (match) {
      parsed = JSON.parse(match[1]);
    } else {
      throw new Error(`Failed to parse Gemini response: ${raw.slice(0, 200)}`);
    }
  }

  return {
    weekLabel,
    summary: parsed.summary,
    items: parsed.items,
    totalPostsAnalyzed: posts.length,
    totalVotesCounted,
  };
}
