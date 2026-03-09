/**
 * Feature Post Synthesizer
 *
 * Runs every 6 hours. For each cycle:
 * 1. Fetch unprocessed community posts + recent comments on existing feature posts
 * 2. AI groups new posts → creates or updates Feature Posts
 * 3. AI re-writes summaries fairly based on all comments/votes
 * 4. AI updates sprint items from top-scored Feature Posts
 */

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

export interface FeaturePostDraft {
  title: string;
  summary: string;
  ai_reasoning: string;
  call_to_action: string;
  post_type: "feature" | "bug" | "improvement";
  product: "oo.ai" | "o talk" | "platform" | null;
  priority_score: number;
  source_post_ids: string[];
}

export interface UpdatedFeaturePost {
  id: string;
  summary: string;
  ai_reasoning: string;
  call_to_action: string;
  priority_score: number;
}

interface RawPost {
  id: string;
  title: string;
  content: string | null;
  post_type: string;
  product: string | null;
  upvote_count: number;
  comment_count: number;
  created_at: string;
}

interface ExistingFeature {
  id: string;
  title: string;
  summary: string | null;
  post_type: string;
  product: string | null;
  vote_count: number;
  comment_count: number;
  source_post_ids: string[];
  recent_comments: string[];
}

// ─── Create new Feature Posts from unprocessed community posts ───

export async function synthesizeNewFeaturePosts(
  newPosts: RawPost[],
  existingFeatures: ExistingFeature[]
): Promise<FeaturePostDraft[]> {
  if (newPosts.length === 0) return [];

  const prompt = `You are an AI product manager for OpenResearch, an AI-first company.
Your job is to synthesize raw community feedback into clear, actionable Feature Posts.

## Existing Feature Posts (do NOT duplicate these):
${JSON.stringify(existingFeatures.map(f => ({ id: f.id, title: f.title, product: f.product })), null, 2)}

## New Community Posts to process:
${JSON.stringify(newPosts.map(p => ({
  id: p.id,
  title: p.title,
  content: p.content?.slice(0, 300),
  type: p.post_type,
  product: p.product,
  upvotes: p.upvote_count,
})), null, 2)}

## Instructions:
1. Group related posts together (e.g., 3 posts about dark mode → 1 Feature Post)
2. Skip posts that are already covered by existing Feature Posts (list their IDs in source_post_ids but don't create new)
3. For each new Feature Post:
   - Write a clear title (action-oriented: "Add dark mode to oo.ai")
   - Write a balanced, neutral summary of what the community wants and why
   - Write ai_reasoning: why this matters / priority justification
   - Write call_to_action: short, encouraging sentence to get more votes/comments
   - Set priority_score 0-100 based on: upvotes × 2 + comment_count × 1.5 + urgency
4. Output ONLY JSON, no markdown.

## Output format:
[
  {
    "title": "string",
    "summary": "string (2-4 sentences, balanced, references community input)",
    "ai_reasoning": "string (1-2 sentences on priority)",
    "call_to_action": "string (e.g., '다크 모드가 필요하신가요? 투표로 의견을 표현해주세요!')",
    "post_type": "feature" | "bug" | "improvement",
    "product": "oo.ai" | "o talk" | "platform" | null,
    "priority_score": number,
    "source_post_ids": ["id1", "id2"]
  }
]`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { maxOutputTokens: 3000, responseMimeType: "application/json" },
  });

  return parseJSON<FeaturePostDraft[]>(response.text, []);
}

// ─── Update existing Feature Posts based on new comments/votes ───

export async function updateFeaturePost(
  feature: ExistingFeature
): Promise<UpdatedFeaturePost> {
  const prompt = `You are a neutral AI product manager. Update this Feature Post based on new community activity.

## Current Feature Post:
Title: ${feature.title}
Current summary: ${feature.summary}
Votes: ${feature.vote_count} | Comments: ${feature.comment_count}

## New comments from the community:
${feature.recent_comments.map((c, i) => `${i + 1}. "${c}"`).join("\n")}

## Instructions:
- Rewrite the summary to fairly represent ALL community perspectives (including minority opinions)
- Update ai_reasoning with current priority justification
- Update call_to_action to encourage more engagement
- Recalculate priority_score (0-100)
- Be neutral, factual, and transparent about trade-offs
- Output ONLY JSON, no markdown.

## Output:
{
  "id": "${feature.id}",
  "summary": "string",
  "ai_reasoning": "string",
  "call_to_action": "string",
  "priority_score": number
}`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { maxOutputTokens: 800, responseMimeType: "application/json" },
  });

  const parsed = parseJSON<UpdatedFeaturePost>(response.text, {
    id: feature.id,
    summary: feature.summary ?? "",
    ai_reasoning: "",
    call_to_action: "",
    priority_score: feature.vote_count * 2,
  });

  return { ...parsed, id: feature.id };
}

// ─── Generate sprint items from top Feature Posts ───

export async function generateSprintFromFeatures(
  topFeatures: ExistingFeature[]
): Promise<{ title: string; description: string; product: string | null; source_post_ids: string[]; community_score: number }[]> {
  if (topFeatures.length === 0) return [];

  const prompt = `You are an AI product manager. Convert these top-voted Feature Posts into sprint items.

## Top Feature Posts:
${JSON.stringify(topFeatures.map(f => ({
  id: f.id,
  title: f.title,
  summary: f.summary,
  product: f.product,
  votes: f.vote_count,
})), null, 2)}

## Instructions:
- Select 3-6 items for this sprint
- Prioritize bugs > highly-voted features > improvements
- Write clear, actionable sprint item titles
- Output ONLY JSON.

[{ "title": "string", "description": "string", "product": "oo.ai"|"o talk"|"platform"|null, "source_post_ids": ["feature-id"], "community_score": number }]`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { maxOutputTokens: 1500, responseMimeType: "application/json" },
  });

  return parseJSON(response.text, []);
}

// ─── Utility ───

function parseJSON<T>(text: string | undefined, fallback: T): T {
  if (!text) return fallback;
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
    if (match) {
      try { return JSON.parse(match[1]); } catch { /* */ }
    }
    return fallback;
  }
}
